"""读取由 life 专用工具维护的晨报动态输入。"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


class MorningInputsError(RuntimeError):
    """动态输入损坏、越界或不符合 schema。"""


@dataclass
class MorningInputProjection:
    schedule: list[dict[str, Any]] = field(default_factory=list)
    tasks: list[dict[str, Any]] = field(default_factory=list)
    module_notes: dict[str, list[str]] = field(default_factory=dict)
    preferences: dict[str, dict[str, str | int | float | bool]] = field(default_factory=dict)
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    revision: int = 0


def _confined_json(path: Path, owner_root: Path) -> Path:
    root = owner_root.resolve()
    target = path.resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise MorningInputsError("晨报动态输入必须位于 life 专属资料区") from exc
    if target.suffix.lower() != ".json" or not target.is_file() or target.is_symlink():
        raise MorningInputsError("晨报动态输入不是可用的普通 JSON 文件")
    if target.stat().st_size > 1024 * 1024:
        raise MorningInputsError("晨报动态输入超过大小上限")
    if os.name == "posix" and target.stat().st_mode & 0o077:
        raise MorningInputsError("晨报动态输入权限必须为 0600")
    return target


def _load(path: Path, owner_root: Path) -> dict[str, Any]:
    target = _confined_json(path, owner_root)
    try:
        raw = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise MorningInputsError("晨报动态输入无法安全读取") from exc
    if not isinstance(raw, dict):
        raise MorningInputsError("晨报动态输入顶层必须是对象")
    if raw.get("schema") != "hehuan.morning-brief-inputs" or raw.get("schemaVersion") != 1:
        raise MorningInputsError("晨报动态输入 schema 不受支持")
    for key in ("events", "tasks", "notes", "locationOverrides"):
        if not isinstance(raw.get(key), list):
            raise MorningInputsError(f"晨报动态输入 {key} 结构无效")
    if not isinstance(raw.get("preferences"), dict):
        raise MorningInputsError("晨报动态输入 preferences 结构无效")
    return raw


def _instant(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise MorningInputsError(f"{field} 缺失")
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise MorningInputsError(f"{field} 不是有效时间") from exc
    if parsed.tzinfo is None:
        raise MorningInputsError(f"{field} 必须包含时区")
    return parsed


def _date(value: Any, field: str) -> date:
    if not isinstance(value, str):
        raise MorningInputsError(f"{field} 缺失")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise MorningInputsError(f"{field} 不是有效日期") from exc


def _event_occurs(item: dict[str, Any], target: date, timezone: ZoneInfo) -> bool:
    if item.get("status") == "cancelled":
        return False
    base = _instant(item.get("eventAt"), "eventAt").astimezone(timezone).date()
    if target < base:
        return False
    recurrence = item.get("recurrence", "none")
    if recurrence == "none":
        return target == base
    days = (target - base).days
    if recurrence == "daily":
        return True
    if recurrence == "weekly":
        return days % 7 == 0
    raise MorningInputsError("日程 recurrence 不受支持")


def _event_projection(item: dict[str, Any], timezone: ZoneInfo) -> dict[str, Any]:
    start = _instant(item.get("eventAt"), "eventAt").astimezone(timezone)
    projected: dict[str, Any] = {
        "id": str(item.get("id", "")),
        "time": start.strftime("%H:%M"),
        "title": str(item.get("title", "")).strip(),
        "status": item.get("status", "confirmed"),
        "source": item.get("source", {}).get("kind") if isinstance(item.get("source"), dict) else None,
    }
    if not projected["title"]:
        raise MorningInputsError("日程 title 缺失")
    if isinstance(item.get("endAt"), str):
        projected["endAt"] = _instant(item["endAt"], "endAt").astimezone(timezone).strftime("%H:%M")
    if isinstance(item.get("location"), str) and item["location"].strip():
        projected["location"] = item["location"].strip()
    reminder = item.get("reminder")
    if isinstance(reminder, dict) and isinstance(reminder.get("minutesBefore"), int):
        projected["reminderMinutes"] = reminder["minutesBefore"]
    return projected


def load_morning_inputs(
    path: Path,
    target_date: date,
    *,
    timezone_name: str,
    owner_root: Path,
) -> MorningInputProjection:
    """校验动态输入并只投影目标日需要的最小字段。"""
    raw = _load(path, owner_root)
    timezone = ZoneInfo(timezone_name)
    projection = MorningInputProjection(revision=int(raw.get("revision", 0)))

    for item in raw["events"]:
        if not isinstance(item, dict):
            raise MorningInputsError("日程记录必须是对象")
        if _event_occurs(item, target_date, timezone):
            projection.schedule.append(_event_projection(item, timezone))
    projection.schedule.sort(key=lambda item: (item.get("time", ""), item.get("title", "")))

    for item in raw["tasks"]:
        if not isinstance(item, dict):
            raise MorningInputsError("待办记录必须是对象")
        if item.get("status") == "archived":
            continue
        due = item.get("dueDate")
        if due is not None and _date(due, "dueDate") != target_date:
            continue
        title = str(item.get("title", "")).strip()
        if not title:
            raise MorningInputsError("待办 title 缺失")
        projection.tasks.append({
            "id": str(item.get("id", "")),
            "title": title,
            "status": item.get("status", "todo"),
            "note": str(item.get("note", "")).strip(),
            "source": item.get("source", {}).get("kind") if isinstance(item.get("source"), dict) else None,
        })

    for item in raw["notes"]:
        if not isinstance(item, dict):
            raise MorningInputsError("模块补记必须是对象")
        if item.get("status") != "active":
            continue
        if not (_date(item.get("startDate"), "startDate") <= target_date <= _date(item.get("endDate"), "endDate")):
            continue
        module = str(item.get("module", ""))
        content = str(item.get("content", "")).strip()
        if module not in {"header", "weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar"}:
            raise MorningInputsError("模块补记 module 不受支持")
        if not content:
            raise MorningInputsError("模块补记 content 缺失")
        projection.module_notes.setdefault(module, []).append(content)

    for module, values in raw["preferences"].items():
        if module not in {"header", "weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar"}:
            raise MorningInputsError("偏好 module 不受支持")
        if not isinstance(values, dict):
            raise MorningInputsError("模块偏好必须是对象")
        projection.preferences[module] = {
            str(key): value for key, value in values.items()
            if isinstance(value, (str, int, float, bool))
        }

    active_locations: list[dict[str, Any]] = []
    for item in raw["locationOverrides"]:
        if not isinstance(item, dict):
            raise MorningInputsError("地点覆盖必须是对象")
        if item.get("status") != "active":
            continue
        if _date(item.get("startDate"), "startDate") <= target_date <= _date(item.get("endDate"), "endDate"):
            active_locations.append(item)
    if len(active_locations) > 1:
        raise MorningInputsError("目标日期存在多个有效地点覆盖，无法安全选择")
    if active_locations:
        selected = active_locations[0]
        latitude = selected.get("latitude")
        longitude = selected.get("longitude")
        if not isinstance(latitude, (int, float)) or not -90 <= latitude <= 90:
            raise MorningInputsError("地点纬度无效")
        if not isinstance(longitude, (int, float)) or not -180 <= longitude <= 180:
            raise MorningInputsError("地点经度无效")
        projection.location_name = str(selected.get("name", "")).strip() or None
        projection.latitude = float(latitude)
        projection.longitude = float(longitude)
    return projection

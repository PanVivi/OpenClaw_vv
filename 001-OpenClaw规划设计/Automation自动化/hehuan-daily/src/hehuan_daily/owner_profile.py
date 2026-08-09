"""从 life 专属资料区只读装配晨间安排。

该模块只读取生成当日行程必需的排班字段，不复制出生资料、
身份字段或完整原文，也不把地点名称渲染到晨间消息。
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from .models import PersonalTemplate
from .morning_inputs import MorningInputsError, load_morning_inputs


OWNER_ROOT = Path("/Volume3/OpenClaw/home/.openclaw/agents/life/users/Vivi")


class OwnerProfileError(RuntimeError):
    """专属资料不可用或结构不安全。"""


def _confined_profile(path: Path, owner_root: Path) -> Path:
    resolved_root = owner_root.resolve()
    resolved = path.resolve()
    try:
        resolved.relative_to(resolved_root)
    except ValueError as exc:
        raise OwnerProfileError("业主资料必须位于 life 专属资料区") from exc
    if resolved.suffix.lower() != ".json":
        raise OwnerProfileError("业主资料必须是 JSON 文件")
    if not resolved.is_file() or resolved.is_symlink():
        raise OwnerProfileError("业主资料不存在或不是可用的普通文件")
    return resolved


def _read_json(path: Path, owner_root: Path) -> dict[str, Any]:
    target = _confined_profile(path, owner_root)
    try:
        raw = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise OwnerProfileError("业主资料无法安全读取") from exc
    if not isinstance(raw, dict):
        raise OwnerProfileError("业主资料顶层必须是对象")
    return raw


def _nonempty_string(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _shift_schedule(profile: dict[str, Any], target_date: date) -> list[dict[str, str]]:
    rotation = profile.get("shift_rotation")
    schedules = profile.get("shift_schedules")
    if not isinstance(rotation, dict) or not isinstance(schedules, dict):
        return []

    try:
        anchor = date.fromisoformat(str(rotation["anchor_date"]))
        cycle_days = int(rotation["cycle_days"])
        starts = rotation["shift_start_cycle"]
    except (KeyError, TypeError, ValueError) as exc:
        raise OwnerProfileError("排班轮转结构不完整") from exc
    if cycle_days <= 0 or cycle_days > 64 or not isinstance(starts, list):
        raise OwnerProfileError("排班轮转周期无效")
    if len(starts) != cycle_days:
        raise OwnerProfileError("排班轮转周期与班次数量不一致")

    rotation_token = starts[(target_date - anchor).days % cycle_days]
    if rotation_token in (None, "", "off", "rest"):
        return []
    if not isinstance(rotation_token, str):
        raise OwnerProfileError("当日班次标识无效")
    if rotation_token.startswith("休"):
        return []
    token_prefixes = {
        "白": ("day", "白班"),
        "二": ("second", "二班"),
        "三": ("third", "夜班"),
    }
    mapped = next(
        (value for prefix, value in token_prefixes.items() if rotation_token.startswith(prefix)),
        None,
    )
    if mapped is None:
        # 保留对英文标准化资料的兼容，但不对未知标识做推测。
        mapped = {
            "day": ("day", "白班"),
            "second": ("second", "二班"),
            "third": ("third", "夜班"),
        }.get(rotation_token)
    if mapped is None:
        raise OwnerProfileError("当日班次标识未在允许映射中")
    shift_key, shift_name = mapped
    if not isinstance(schedules.get(shift_key), dict):
        raise OwnerProfileError("当日班次没有对应的已确认时间表")

    details: dict[str, Any] = schedules[shift_key]
    fields = (
        ("alarm", "起身"),
        ("leave_home_approx", "准备出门"),
        ("clock_in_before", "到岗前"),
        ("handover", "交接"),
        ("handover_next_day", "次日交接"),
        ("clock_out_approx", "约下班"),
        ("clock_out_next_day_approx", "次日约下班"),
    )
    items: list[dict[str, str]] = []
    for key, label in fields:
        value = _nonempty_string(details.get(key))
        if value:
            items.append({"time": value, "title": f"{shift_name}·{label}"})
    return items


def load_owner_template(
    path: Path,
    target_date: date,
    *,
    timezone_name: str,
    latitude: float,
    longitude: float,
    owner_root: Path = OWNER_ROOT,
    morning_inputs_path: Path | None = None,
) -> PersonalTemplate:
    """构建仅在当次运行内存在的最小晨间模板。"""
    profile = _read_json(path, owner_root)
    schedule = _shift_schedule(profile, target_date)
    custom_sections: dict[str, Any] = {
        "schedule": schedule,
        "tasks": [],
        "disciples": [],
        "module_notes": {},
        "preferences": {},
    }
    effective_latitude = latitude
    effective_longitude = longitude
    location_name = None
    if morning_inputs_path is not None and morning_inputs_path.exists():
        try:
            dynamic = load_morning_inputs(
                morning_inputs_path,
                target_date,
                timezone_name=timezone_name,
                owner_root=owner_root,
            )
            # The schedule renderer has a bounded item count. Explicit owner
            # events therefore come first so shift milestones cannot hide a
            # newly confirmed appointment from the morning brief.
            custom_sections["schedule"] = [*dynamic.schedule, *schedule]
            custom_sections["tasks"] = dynamic.tasks
            custom_sections["module_notes"] = dynamic.module_notes
            custom_sections["preferences"] = dynamic.preferences
            custom_sections["input_revision"] = dynamic.revision
            if dynamic.latitude is not None and dynamic.longitude is not None:
                effective_latitude = dynamic.latitude
                effective_longitude = dynamic.longitude
                location_name = dynamic.location_name
        except MorningInputsError:
            custom_sections["module_notes"] = {
                "schedule": ["少主交代的晨报补充资料暂时无法核清，本次不采用含糊内容。"]
            }
            custom_sections["input_degraded"] = True
    now = datetime.now(timezone.utc)
    return PersonalTemplate(
        template_id="owner-morning-brief",
        name="少主晨间安排",
        created_at=now,
        updated_at=now,
        timezone=timezone_name,
        location_name=location_name,
        # 坐标来自同一专属目录的 0600 运行配置；消息不显示地名。
        latitude=effective_latitude,
        longitude=effective_longitude,
        custom_sections=custom_sections,
    )

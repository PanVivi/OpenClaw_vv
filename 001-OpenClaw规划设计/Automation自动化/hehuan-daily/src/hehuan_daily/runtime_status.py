"""向蕭觀音投影唯一晨报的最小运行状态。"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .state_store import AtomicJSONStore


def default_runtime_status() -> dict[str, Any]:
    return {
        "schema": "hehuan.morning-brief-runtime",
        "schemaVersion": 1,
        "declarationKey": "hehuan-daily-v1",
        "enabled": False,
        "schedule": "0 6 * * *",
        "timezone": "Asia/Taipei",
        "disabledReason": "尚未完成生产验收",
    }


def record_run(
    path: Path,
    *,
    brief_date: str,
    success: bool,
    status: str,
    message_id: str | None,
) -> None:
    """保留部署状态，只更新最近一次运行事实。"""
    store = AtomicJSONStore(path, default_runtime_status)

    def mutate(value: dict[str, Any]) -> None:
        value.setdefault("schema", "hehuan.morning-brief-runtime")
        value.setdefault("schemaVersion", 1)
        value["lastRunAt"] = datetime.now(timezone.utc).isoformat()
        value["lastBriefDate"] = brief_date
        value["lastRunSuccess"] = success
        value["lastRunStatus"] = status
        value["lastMessageId"] = message_id

    store.update(mutate)

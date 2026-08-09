"""临时出行覆盖管理：按日期/地点覆盖默认配置，强制 expires_at。

时区策略: expires_at 强制为 UTC aware datetime。
create() 接受 ISO 8601 字符串或 datetime；字符串无 tzinfo 时假定为 UTC。
is_active() 使用 aware UTC 时间比较，避免 TypeError。
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

from .clock import Clock, SystemClock
from .config import Config, default_config
from .exceptions import OverrideError
from .models import TravelOverride
from .schemas import validate_override
from .state_store import _fsync_directory

logger = logging.getLogger(__name__)


class OverrideManager:
    """出行覆盖管理器。"""

    def __init__(
        self,
        config: Optional[Config] = None,
        clock: Optional[Clock] = None,
    ):
        self.config = config or default_config
        self.clock = clock or SystemClock()
        self._ensure_dir()

    # ── CRUD ─────────────────────────────────────────────────
    def create(self, data: dict) -> TravelOverride:
        """创建出行覆盖。
        
        expires_at 为强制字段，支持:
        - ISO 8601 字符串 (无 tzinfo 时假定为 UTC)
        - datetime 对象 (naive 时假定为 UTC)
        """
        errors = validate_override(data)
        if errors:
            raise OverrideError(f"覆盖校验失败: {'; '.join(errors)}")

        # 强制 expires_at
        if "expires_at" not in data:
            raise OverrideError("expires_at 为强制字段，不可省略")

        # 时区归一化：确保 expires_at 是 aware UTC
        data["expires_at"] = _normalize_aware_utc(data["expires_at"])

        override = self._dict_to_model(data)
        self._save(override)
        return override

    def get(self, override_id: str) -> Optional[TravelOverride]:
        """读取覆盖。"""
        path = self._path_for(override_id)
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return self._dict_to_model(data)
        except (json.JSONDecodeError, KeyError) as e:
            raise OverrideError(f"覆盖文件损坏: {e}") from e

    def delete(self, override_id: str) -> bool:
        """删除覆盖。"""
        path = self._path_for(override_id)
        if os.path.exists(path):
            os.remove(path)
            return True
        return False

    def list_all(self) -> list[TravelOverride]:
        """列出所有覆盖。"""
        result = []
        if not os.path.exists(self.config.override_dir):
            return result
        for f in os.listdir(self.config.override_dir):
            if f.endswith(".json"):
                oid = f.replace(".json", "")
                override = self.get(oid)
                if override:
                    result.append(override)
        return result

    def find_active(
        self, target_date: Optional[date] = None
    ) -> list[TravelOverride]:
        """查找在指定日期有效的覆盖。"""
        if target_date is None:
            target_date = self.clock.local_date(self.config.timezone)
        now_utc = self.clock.now_utc()
        return [
            o for o in self.list_all()
            if o.is_active(target_date, now_utc=now_utc)
        ]

    def cleanup_expired(self) -> int:
        """清理已过期的覆盖。返回删除数量。"""
        now = self.clock.now_utc()
        removed = 0
        for o in self.list_all():
            if now >= o.expires_at:
                self.delete(o.override_id)
                removed += 1
        return removed

    # ── 持久化 ───────────────────────────────────────────────
    def _save(self, override: TravelOverride) -> None:
        """原子写入覆盖文件。使用 tempfile + os.rename，权限 0o600。"""
        path = self._path_for(override.override_id)
        data = self._model_to_dict(override)

        dir_name = os.path.dirname(path)
        try:
            fd, tmp_path = tempfile.mkstemp(
                dir=dir_name, suffix=".tmp", prefix=".override-"
            )
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                os.chmod(tmp_path, 0o600)
                os.replace(tmp_path, path)
                _fsync_directory(Path(dir_name))
            except BaseException:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
                raise
        except OSError as e:
            raise OverrideError(f"写入覆盖文件失败: {e}") from e

    def _path_for(self, override_id: str) -> str:
        safe_id = os.path.basename(override_id)
        if safe_id != override_id or not override_id:
            raise OverrideError(f"非法覆盖 ID: {override_id}")
        return os.path.join(self.config.override_dir, f"{override_id}.json")

    def _ensure_dir(self) -> None:
        os.makedirs(self.config.override_dir, exist_ok=True)

    # ── 模型转换 ─────────────────────────────────────────────
    def _dict_to_model(self, data: dict) -> TravelOverride:
        return TravelOverride(
            override_id=data["override_id"],
            start_date=date.fromisoformat(data["start_date"]),
            end_date=date.fromisoformat(data["end_date"]),
            location_name=data["location_name"],
            latitude=float(data["latitude"]),
            longitude=float(data["longitude"]),
            expires_at=_normalize_aware_utc(data["expires_at"]),
            created_at=_normalize_aware_utc(
                data.get("created_at", datetime.now(timezone.utc).isoformat())
            ),
            notes=data.get("notes"),
        )

    def _model_to_dict(self, o: TravelOverride) -> dict:
        return {
            "override_id": o.override_id,
            "start_date": o.start_date.isoformat(),
            "end_date": o.end_date.isoformat(),
            "location_name": o.location_name,
            "latitude": o.latitude,
            "longitude": o.longitude,
            "expires_at": o.expires_at.isoformat(),
            "created_at": o.created_at.isoformat(),
            "notes": o.notes,
        }


# ── 模块级辅助函数 ──────────────────────────────────────────
def _normalize_aware_utc(value) -> datetime:
    """将字符串或 datetime 归一化为 aware UTC datetime。
    
    - 字符串无 tzinfo → 假定为 UTC
    - datetime naive → 假定为 UTC
    - datetime aware → 转换为 UTC
    """
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    raise OverrideError(f"无法解析时间: {value!r}")

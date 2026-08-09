"""可注入时钟：所有业务日期都从明确时区计算。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Protocol
from zoneinfo import ZoneInfo


class Clock(Protocol):
    def now_utc(self) -> datetime: ...

    def local_date(self, timezone_name: str) -> date: ...


@dataclass(frozen=True)
class SystemClock:
    def now_utc(self) -> datetime:
        return datetime.now(timezone.utc)

    def local_date(self, timezone_name: str) -> date:
        return self.now_utc().astimezone(ZoneInfo(timezone_name)).date()


@dataclass(frozen=True)
class FrozenClock:
    current_utc: datetime

    def now_utc(self) -> datetime:
        value = self.current_utc
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def local_date(self, timezone_name: str) -> date:
        return self.now_utc().astimezone(ZoneInfo(timezone_name)).date()


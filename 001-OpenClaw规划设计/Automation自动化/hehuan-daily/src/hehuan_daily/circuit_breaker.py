"""连续失败熔断：同根因追踪、升级、停止。"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from .clock import Clock, SystemClock
from .state_store import AtomicJSONStore, StateStoreCorruptionError


# ── 熔断阈值 ──────────────────────────────────────────────────
ESCALATE_CONSECUTIVE_DAYS = 3  # 3 天同根因 → 升级告警
STOP_CONSECUTIVE_FAILURES = 5  # 5 个连续自然日失败 → 停止发送


@dataclass
class FailureRecord:
    """单次失败记录。"""

    date: str  # YYYY-MM-DD
    root_cause: str  # 根因分类
    detail: str  # 详细描述


@dataclass
class CircuitState:
    """熔断器状态。"""

    consecutive_failures: int = 0  # 连续失败次数
    is_stopped: bool = False  # 是否已停止
    stopped_at: Optional[str] = None  # 停止时间
    stopped_reason: Optional[str] = None
    last_failure_date: Optional[str] = None
    last_root_cause: Optional[str] = None
    failures: list[dict] = field(default_factory=list)  # 最近失败记录

    def record_failure(
        self,
        root_cause: str,
        detail: str,
        local_day: date,
        occurred_at: datetime,
    ) -> None:
        """记录一次失败。"""
        today = local_day.isoformat()
        if self.last_failure_date != today:
            if self.last_failure_date:
                previous = date.fromisoformat(self.last_failure_date)
                self.consecutive_failures = (
                    self.consecutive_failures + 1
                    if local_day - previous == timedelta(days=1)
                    else 1
                )
            else:
                self.consecutive_failures = 1
        self.last_failure_date = today
        self.last_root_cause = root_cause
        self.failures.append({
            "date": today,
            "root_cause": root_cause,
            "detail": detail,
        })
        # 只保留最近 30 条记录
        if len(self.failures) > 30:
            self.failures = self.failures[-30:]
        # 检查是否触发停止
        if self.consecutive_failures >= STOP_CONSECUTIVE_FAILURES:
            self.is_stopped = True
            self.stopped_at = occurred_at.astimezone(timezone.utc).isoformat()
            self.stopped_reason = (
                f"连续 {self.consecutive_failures} 个自然日失败，"
                f"最近根因: {root_cause}"
            )

    def record_success(self) -> None:
        """记录一次成功，重置连续失败计数。"""
        self.consecutive_failures = 0
        # 注意：不重置 is_stopped，停止状态需人工解除

    def should_escalate(self) -> bool:
        """检查是否应升级告警（3 天同根因）。"""
        if len(self.failures) < ESCALATE_CONSECUTIVE_DAYS:
            return False
        # 同一天的多次失败只算一天，且必须是连续自然日。
        recent_by_date: list[dict] = []
        seen_dates: set[str] = set()
        for failure in reversed(self.failures):
            failure_date = failure.get("date")
            if failure_date in seen_dates:
                continue
            seen_dates.add(failure_date)
            recent_by_date.append(failure)
            if len(recent_by_date) == ESCALATE_CONSECUTIVE_DAYS:
                break
        if len(recent_by_date) < ESCALATE_CONSECUTIVE_DAYS:
            return False

        recent_dates = [date.fromisoformat(f["date"]) for f in recent_by_date]
        if any(
            recent_dates[i] - recent_dates[i + 1] != timedelta(days=1)
            for i in range(len(recent_dates) - 1)
        ):
            return False
        root_causes = [f["root_cause"] for f in recent_by_date]
        return len(set(root_causes)) == 1

    def current_escalation_cause(self) -> Optional[str]:
        """返回当前升级告警的根因（如果有）。"""
        if self.should_escalate() and self.failures:
            return self.failures[-1]["root_cause"]
        return None


class CircuitBreaker:
    """连续失败熔断器。

    规则：
    - 3 天连续同根因失败 → 升级告警（但仍继续尝试）
    - 5 次连续失败 → 停止发送（需人工解除）
    - 任何成功 → 重置连续失败计数（但不自动解除停止）
    """

    def __init__(
        self,
        state_path: Path | str,
        clock: Optional[Clock] = None,
        timezone_name: str = "Asia/Taipei",
    ):
        self.state_path = Path(state_path)
        self.clock = clock or SystemClock()
        self.timezone_name = timezone_name
        self._store = AtomicJSONStore(self.state_path, dict)
        self.state = self._load()

    def _load(self) -> CircuitState:
        try:
            data = self._store.read()
            return CircuitState(**{
                k: v for k, v in data.items()
                if k in CircuitState.__dataclass_fields__
            })
        except (StateStoreCorruptionError, TypeError, ValueError):
            return CircuitState(
                is_stopped=True,
                stopped_at=self.clock.now_utc().isoformat(),
                stopped_reason="熔断状态文件损坏，需人工核对",
            )

    def _save(self) -> None:
        snapshot = asdict(self.state)
        self._store.update(lambda data: (data.clear(), data.update(snapshot)))

    def check(self) -> tuple[bool, Optional[str]]:
        """检查是否允许执行。

        Returns:
            (allowed, reason) — allowed=False 时 reason 为阻止原因。
        """
        self.state = self._load()
        if self.state.is_stopped:
            return False, self.state.stopped_reason or "熔断器已停止"
        return True, None

    def record_failure(self, root_cause: str, detail: str) -> None:
        """记录失败。"""
        local_day = self.clock.local_date(self.timezone_name)
        occurred_at = self.clock.now_utc()
        def mutate(data: dict) -> None:
            state = CircuitState(**{
                k: v for k, v in data.items()
                if k in CircuitState.__dataclass_fields__
            })
            state.record_failure(root_cause, detail, local_day, occurred_at)
            data.clear()
            data.update(asdict(state))
            self.state = state
        self._store.update(mutate)

    def record_success(self) -> None:
        """记录成功。"""
        def mutate(data: dict) -> None:
            state = CircuitState(**{
                k: v for k, v in data.items()
                if k in CircuitState.__dataclass_fields__
            })
            state.record_success()
            data.clear()
            data.update(asdict(state))
            self.state = state
        self._store.update(mutate)

    def should_escalate(self) -> bool:
        """是否应升级告警。"""
        self.state = self._load()
        return self.state.should_escalate()

    def escalation_cause(self) -> Optional[str]:
        """升级告警的根因。"""
        self.state = self._load()
        return self.state.current_escalation_cause()

    def reset(self) -> None:
        """人工解除停止状态（重置全部）。"""
        self.state = CircuitState()
        self._save()

"""调度器：编排数据采集 → pipeline → 闸门 → 发送 → 熔断。"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Optional, Sequence

from . import weather as weather_mod
from . import aqi as aqi_mod
from . import lunar as lunar_mod
from .circuit_breaker import CircuitBreaker
from .clock import Clock, SystemClock
from .config import Config, default_config
from .constants import TITLE_PREFIX
from .exceptions import (
    AQIError,
    DataSourceError,
    LunarError,
    WeatherError,
)
from .final_brief import CURRENT_BRIEF_VERSION, build_idempotency_key, create_final_brief
from .idempotency import ReceiptStore, ReceiptStoreError
from .lock import file_lock, LockError
from .models import (
    AQIData,
    AQILevel,
    DataSourceResult,
    LunarData,
    PersonalTemplate,
    TravelOverride,
    WeatherData,
)
from .pipeline import run_pipeline, PipelineResult
from .sender import MessageTransport, Sender, SendResult

logger = logging.getLogger(__name__)


# ── 错误根因分类 ──────────────────────────────────────────────
class RootCause:
    """失败根因常量。"""

    WEATHER = "weather_fetch"
    AQI = "aqi_fetch"
    LUNAR = "lunar_compute"
    PIPELINE = "pipeline"
    GATE = "gate_rejected"
    SEND = "send_failed"
    LOCK = "lock_timeout"
    CIRCUIT = "circuit_stopped"
    DUPLICATE = "duplicate_skip"
    UNKNOWN = "unknown"


# ── 调度结果 ──────────────────────────────────────────────────
@dataclass
class ScheduleResult:
    """一次调度执行的完整结果。"""

    success: bool
    status: str  # sent | not_sent | unknown | skipped_duplicate | failed | blocked_*
    idempotency_key: str = ""
    message_id: Optional[str] = None
    error: Optional[str] = None
    root_cause: Optional[str] = None
    was_duplicate: bool = False  # 是否因幂等跳过
    degraded_modules: list[str] = field(default_factory=list)
    failed_modules: list[str] = field(default_factory=list)
    pipeline_result: Optional[PipelineResult] = None
    send_result: Optional[SendResult] = None
    escalation_warning: Optional[str] = None  # 3 天同根因升级告警

    @property
    def should_update_circuit(self) -> bool:
        """是否需要更新熔断器（duplicate skip 不需要）。"""
        return self.status not in ("skipped_duplicate", "not_sent", "unknown")


class Scheduler:
    """晨间玉简调度器。

    编排完整流程：
    1. 文件锁（防并发）
    2. 熔断器检查（连续失败停止）
    3. 幂等检查（已发送则跳过）
    4. 数据采集（天气/AQI/黄历，含降级）
    5. Pipeline 执行（模块渲染 + 排版）
    6. 构建 FinalBrief
    7. 发送闸门 + 实际发送
    8. 更新熔断器
    9. 检查升级告警
    """

    def __init__(
        self,
        config: Optional[Config] = None,
        receipt_store: Optional[ReceiptStore] = None,
        circuit_breaker: Optional[CircuitBreaker] = None,
        sender: Optional[Sender] = None,
        transport: Optional[MessageTransport] = None,
        clock: Optional[Clock] = None,
        lock_path: Optional[Path] = None,
        data_dir: Optional[Path] = None,
    ):
        self.config = config or default_config
        self.clock = clock or SystemClock()
        self.data_dir = data_dir or Path(self.config.data_dir)
        self.lock_path = lock_path or (self.data_dir / "scheduler.lock")

        self.receipt_store = receipt_store or ReceiptStore(
            self.data_dir / "receipts.json"
        )
        self.circuit_breaker = circuit_breaker or CircuitBreaker(
            self.data_dir / "circuit.json",
            clock=self.clock,
            timezone_name=self.config.timezone,
        )
        self.sender = sender or Sender(
            self.receipt_store, self.config, transport=transport
        )

    def run(
        self,
        target_date: date,
        chat_id: str,
        account_id: str,
        template: Optional[PersonalTemplate] = None,
        active_override: Optional[TravelOverride] = None,
        module_order: Optional[Sequence[str]] = None,
    ) -> ScheduleResult:
        """执行一次完整调度。

        Args:
            target_date: 目标日期
            chat_id: Telegram chat ID
            account_id: Telegram account ID
            template: 个人模板（可选）
            active_override: 出行覆盖（可选）
            module_order: 自定义模块顺序（可选）

        Returns:
            ScheduleResult
        """
        idem_key = build_idempotency_key(
            chat_id,
            target_date.isoformat(),
            version=CURRENT_BRIEF_VERSION,
        )

        # ── 1. 文件锁 ──────────────────────────────────────
        try:
            with file_lock(self.lock_path):
                return self._run_locked(
                    target_date=target_date,
                    chat_id=chat_id,
                    account_id=account_id,
                    idem_key=idem_key,
                    template=template,
                    active_override=active_override,
                    module_order=module_order,
                )
        except LockError as e:
            logger.error("获取文件锁失败: %s", e)
            return ScheduleResult(
                success=False,
                status="blocked_lock",
                idempotency_key=idem_key,
                error=str(e),
                root_cause=RootCause.LOCK,
            )

    def _run_locked(
        self,
        target_date: date,
        chat_id: str,
        account_id: str,
        idem_key: str,
        template: Optional[PersonalTemplate],
        active_override: Optional[TravelOverride],
        module_order: Optional[Sequence[str]],
    ) -> ScheduleResult:
        """在文件锁保护内执行。"""

        # ── 2. 熔断器检查 ──────────────────────────────────
        allowed, reason = self.circuit_breaker.check()
        if not allowed:
            logger.warning("熔断器阻止: %s", reason)
            return ScheduleResult(
                success=False,
                status="blocked_circuit",
                idempotency_key=idem_key,
                error=reason,
                root_cause=RootCause.CIRCUIT,
            )

        if self.config.send_enabled:
            config_errors = self.config.validate_for_real_send(account_id, chat_id)
            if config_errors:
                return ScheduleResult(
                    success=False,
                    status="blocked_config",
                    idempotency_key=idem_key,
                    error="; ".join(config_errors),
                    root_cause=RootCause.GATE,
                )

        # ── 3. 幂等检查 ────────────────────────────────────
        try:
            already_sent = self.receipt_store.is_sent(idem_key)
        except ReceiptStoreError as e:
            return ScheduleResult(
                success=False,
                status="unknown",
                idempotency_key=idem_key,
                error=f"manual_check_required: {e}",
                root_cause=RootCause.UNKNOWN,
            )
        if already_sent:
            logger.info("幂等跳过: %s", idem_key)
            existing_receipt = self.receipt_store.get(idem_key)
            return ScheduleResult(
                success=True,
                status="skipped_duplicate",
                idempotency_key=idem_key,
                was_duplicate=True,
                message_id=existing_receipt.message_id if existing_receipt else None,
                root_cause=RootCause.DUPLICATE,
            )
        existing_receipt = self.receipt_store.get(idem_key)
        if existing_receipt and existing_receipt.status in (
            "pending", "unknown", "unknown_needs_reconcile"
        ):
            return ScheduleResult(
                success=False,
                status="unknown",
                idempotency_key=idem_key,
                error="manual_check_required: existing delivery must be reconciled",
                root_cause=RootCause.UNKNOWN,
            )

        # ── 4. 数据采集（含降级） ──────────────────────────
        degraded_modules: list[str] = []
        failed_modules: list[str] = []

        latitude, longitude = self._effective_location(template, active_override)
        weather_result = self._fetch_weather(
            target_date, latitude, longitude, degraded_modules, failed_modules
        )
        aqi_result = self._fetch_aqi(
            latitude, longitude, degraded_modules, failed_modules
        )
        lunar_result = self._fetch_lunar(target_date, degraded_modules, failed_modules)

        # ── 5. Pipeline 执行 ───────────────────────────────
        pipeline_result = run_pipeline(
            target_date=target_date,
            weather_result=weather_result,
            aqi_result=aqi_result,
            lunar_result=lunar_result,
            template=template,
            active_override=active_override,
            module_order=module_order,
        )

        if not pipeline_result.is_success:
            error_msg = "; ".join(pipeline_result.errors) or "Pipeline 执行失败"
            logger.error("Pipeline 失败: %s", error_msg)
            self.circuit_breaker.record_failure(RootCause.PIPELINE, error_msg)
            self._check_escalation()
            return ScheduleResult(
                success=False,
                status="failed",
                idempotency_key=idem_key,
                error=error_msg,
                root_cause=RootCause.PIPELINE,
                degraded_modules=degraded_modules,
                failed_modules=failed_modules,
                pipeline_result=pipeline_result,
            )

        # ── 6. 构建 FinalBrief ─────────────────────────────
        brief = create_final_brief(
            text=pipeline_result.composed.text,
            account_id=account_id,
            chat_id=chat_id,
            brief_date=target_date.isoformat(),
            version=CURRENT_BRIEF_VERSION,
        )

        # ── 7. 发送闸门 + 发送 ─────────────────────────────
        send_result = self.sender.send(brief)

        # ── 8. 更新熔断器 + 升级检查 ───────────────────────
        if send_result.was_duplicate:
            # 幂等跳过不算失败也不算成功
            return ScheduleResult(
                success=True,
                status="skipped_duplicate",
                idempotency_key=idem_key,
                was_duplicate=True,
                message_id=send_result.message_id,
                root_cause=RootCause.DUPLICATE,
                degraded_modules=degraded_modules,
                pipeline_result=pipeline_result,
                send_result=send_result,
            )

        if send_result.receipt_status in ("unknown", "unknown_needs_reconcile"):
            return ScheduleResult(
                success=False,
                status="unknown",
                idempotency_key=idem_key,
                error=send_result.error,
                root_cause=RootCause.UNKNOWN,
                degraded_modules=degraded_modules,
                failed_modules=failed_modules,
                pipeline_result=pipeline_result,
                send_result=send_result,
            )

        if send_result.was_no_send:
            return ScheduleResult(
                success=True,
                status="not_sent",
                idempotency_key=idem_key,
                error=send_result.error,
                degraded_modules=degraded_modules,
                failed_modules=failed_modules,
                pipeline_result=pipeline_result,
                send_result=send_result,
            )

        if send_result.success:
            self.circuit_breaker.record_success()
            escalation = self._check_escalation()
            return ScheduleResult(
                success=True,
                status="sent",
                idempotency_key=idem_key,
                message_id=send_result.message_id,
                degraded_modules=degraded_modules,
                failed_modules=failed_modules,
                pipeline_result=pipeline_result,
                send_result=send_result,
                escalation_warning=escalation,
            )
        else:
            # 发送失败
            root_cause = (
                RootCause.GATE
                if send_result.gate_errors
                else RootCause.SEND
            )
            self.circuit_breaker.record_failure(
                root_cause, send_result.error or "发送失败"
            )
            escalation = self._check_escalation()
            return ScheduleResult(
                success=False,
                status="failed",
                idempotency_key=idem_key,
                error=send_result.error,
                root_cause=root_cause,
                degraded_modules=degraded_modules,
                failed_modules=failed_modules,
                pipeline_result=pipeline_result,
                send_result=send_result,
                escalation_warning=escalation,
            )

    # ── 数据采集（含降级） ──────────────────────────────────────
    def _fetch_weather(
        self,
        target_date: date,
        latitude: float,
        longitude: float,
        degraded: list[str],
        failed: list[str],
    ) -> Optional[DataSourceResult]:
        """获取天气（主源 Open-Meteo → 备源 MET Norway）。"""
        try:
            source = weather_mod.WeatherSource(self.config)
            result = source.fetch(
                latitude=latitude,
                longitude=longitude,
                target_date=target_date,
            )
            if result.is_degraded:
                degraded.append("weather")
                logger.info("天气已降级到备源: %s", result.source)
            return result
        except Exception as e:
            logger.error("天气采集失败: %s", e)
            failed.append("weather")
            return None

    def _fetch_aqi(
        self,
        latitude: float,
        longitude: float,
        degraded: list[str],
        failed: list[str],
    ) -> Optional[DataSourceResult]:
        """获取 AQI（WAQI → CAMS 降级）。"""
        try:
            source = aqi_mod.AQISource(self.config)
            result = source.fetch(latitude=latitude, longitude=longitude)
            if result.is_degraded:
                degraded.append("aqi")
                logger.info("AQI 已降级到 CAMS: %s", result.source)
            return result
        except Exception as e:
            logger.error("AQI 采集失败: %s", e)
            failed.append("aqi")
            return None

    def _effective_location(
        self,
        template: Optional[PersonalTemplate],
        active_override: Optional[TravelOverride],
    ) -> tuple[float, float]:
        if active_override is not None:
            return active_override.latitude, active_override.longitude
        if template and template.latitude is not None and template.longitude is not None:
            return template.latitude, template.longitude
        return self.config.default_latitude, self.config.default_longitude

    def _fetch_lunar(
        self,
        target_date: date,
        degraded: list[str],
        failed: list[str],
    ) -> Optional[DataSourceResult]:
        """获取黄历/八字（本地计算，无降级）。"""
        try:
            source = lunar_mod.LunarSource()
            return source.fetch(target_date)
        except Exception as e:
            logger.error("黄历计算失败: %s", e)
            failed.append("lunar")
            return None

    # ── 升级告警 ──────────────────────────────────────────────
    def _check_escalation(self) -> Optional[str]:
        """检查是否触发 3 天同根因升级告警。"""
        if self.circuit_breaker.should_escalate():
            cause = self.circuit_breaker.escalation_cause()
            msg = f"连续 3 天同根因失败: {cause}"
            logger.warning(msg)
            return msg
        return None


# ── 便捷入口 ──────────────────────────────────────────────────
def run_once(
    target_date: Optional[date] = None,
    chat_id: Optional[str] = None,
    account_id: str = "life",
    config: Optional[Config] = None,
    data_dir: Optional[Path] = None,
    transport: Optional[MessageTransport] = None,
    clock: Optional[Clock] = None,
) -> ScheduleResult:
    """便捷函数：执行一次调度（用于本地测试）。"""
    if target_date is None:
        clock = clock or SystemClock()
        target_date = clock.local_date((config or default_config).timezone)

    if chat_id is None:
        raise ValueError("chat_id 必须显式提供，禁止使用占位目标")

    scheduler = Scheduler(
        config=config,
        data_dir=data_dir,
        transport=transport,
        clock=clock,
    )
    return scheduler.run(
        target_date=target_date,
        chat_id=chat_id,
        account_id=account_id,
    )

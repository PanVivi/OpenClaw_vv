"""Phase 1-C 测试：调度 + 发送闸门 + 失败降级 + 熔断。

运行: cd /workspace/hehuan-daily && python3 -m unittest tests.test_scheduler -v
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import time
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from hehuan_daily.circuit_breaker import (
    CircuitBreaker,
    CircuitState,
    ESCALATE_CONSECUTIVE_DAYS,
    STOP_CONSECUTIVE_FAILURES,
)
from hehuan_daily.composer import apply_custom_emoji
from hehuan_daily.config import Config
from hehuan_daily.clock import FrozenClock
from hehuan_daily.constants import TITLE_PREFIX
from hehuan_daily.final_brief import build_idempotency_key, create_final_brief
from hehuan_daily.idempotency import ReceiptStore, SendReceipt, compute_text_hash
from hehuan_daily.lock import file_lock, LockError
from hehuan_daily.models import (
    AQIData,
    AQILevel,
    DataSourceResult,
    LunarData,
    WeatherData,
)
from hehuan_daily.pipeline import run_pipeline
from hehuan_daily.scheduler import RootCause, Scheduler
from hehuan_daily.sender import (
    AmbiguousDeliveryError,
    Sender,
    SendResult,
    TransportResult,
)


class FakeTransport:
    def __init__(self, error=None):
        self.error = error
        self.calls = 0

    def send(self, brief):
        self.calls += 1
        if self.error:
            raise self.error
        return TransportResult(message_id=f"msg-{self.calls}")


# ══════════════════════════════════════════════════════════════
# Lock
# ══════════════════════════════════════════════════════════════
class TestFileLock(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.lock_path = Path(self.tmpdir) / "test.lock"

    def test_lock_acquire_release(self):
        """锁可以正常获取和释放。"""
        with file_lock(self.lock_path, timeout=1.0):
            self.assertTrue(self.lock_path.exists())

    def test_lock_exclusive(self):
        """锁是排他的：持锁时再次获取应超时。"""
        with file_lock(self.lock_path, timeout=1.0):
            with self.assertRaises(LockError):
                with file_lock(self.lock_path, timeout=0.5):
                    pass  # 不应执行到这里

    def test_lock_release_after_exit(self):
        """退出后锁可被重新获取。"""
        with file_lock(self.lock_path, timeout=1.0):
            pass
        # 应该能再次获取
        with file_lock(self.lock_path, timeout=1.0):
            pass

    def test_lock_creates_parent_dir(self):
        """锁文件路径的父目录不存在时自动创建。"""
        deep_path = Path(self.tmpdir) / "a" / "b" / "c" / "test.lock"
        with file_lock(deep_path, timeout=1.0):
            self.assertTrue(deep_path.exists())


# ══════════════════════════════════════════════════════════════
# Receipt / Idempotency
# ══════════════════════════════════════════════════════════════
class TestReceiptStore(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.store_path = Path(self.tmpdir) / "receipts.json"
        self.store = ReceiptStore(self.store_path)

    def test_put_and_get(self):
        """写入后可读取。"""
        receipt = SendReceipt(
            idempotency_key="morning-brief:123:2026-08-04:v1",
            chat_id="123",
            brief_date="2026-08-04",
            status="sent",
            message_id="msg-001",
        )
        self.store.put(receipt)

        fetched = self.store.get("morning-brief:123:2026-08-04:v1")
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.chat_id, "123")
        self.assertEqual(fetched.status, "sent")
        self.assertEqual(fetched.message_id, "msg-001")

    def test_get_nonexistent(self):
        """读取不存在的 key 返回 None。"""
        self.assertIsNone(self.store.get("nonexistent"))

    def test_is_sent(self):
        """is_sent 判断。"""
        self.assertFalse(self.store.is_sent("key1"))
        self.store.put(SendReceipt(
            idempotency_key="key1", chat_id="1", brief_date="2026-08-04", status="sent",
        ))
        self.assertTrue(self.store.is_sent("key1"))

    def test_is_sent_not_failed(self):
        """failed 状态不算 sent。"""
        self.store.put(SendReceipt(
            idempotency_key="key1", chat_id="1", brief_date="2026-08-04", status="failed",
        ))
        self.assertFalse(self.store.is_sent("key1"))

    def test_has_pending(self):
        """pending 状态判断。"""
        self.store.put(SendReceipt(
            idempotency_key="key1", chat_id="1", brief_date="2026-08-04", status="pending",
        ))
        self.assertTrue(self.store.has_pending("key1"))

    def test_update_existing(self):
        """更新已有收据。"""
        self.store.put(SendReceipt(
            idempotency_key="key1", chat_id="1", brief_date="2026-08-04", status="pending",
        ))
        self.store.put(SendReceipt(
            idempotency_key="key1", chat_id="1", brief_date="2026-08-04",
            status="sent", message_id="msg-002",
        ))
        fetched = self.store.get("key1")
        self.assertEqual(fetched.status, "sent")
        self.assertEqual(fetched.message_id, "msg-002")

    def test_attempts_increment(self):
        """attempts 应递增。"""
        self.store.put(SendReceipt(
            idempotency_key="key1", chat_id="1", brief_date="2026-08-04",
            status="pending", attempts=1,
        ))
        self.store.put(SendReceipt(
            idempotency_key="key1", chat_id="1", brief_date="2026-08-04",
            status="failed", attempts=2,
        ))
        fetched = self.store.get("key1")
        self.assertEqual(fetched.attempts, 2)

    def test_cleanup(self):
        """清理过期收据。"""
        # 直接写入 JSON 绕过 put() 的 updated_at 自动更新
        old_data = {
            "old": {
                "idempotency_key": "old",
                "chat_id": "1",
                "brief_date": "2026-01-01",
                "status": "sent",
                "created_at": "2026-01-01T00:00:00",
                "updated_at": "2026-01-01T00:00:00",
                "sent_at": None,
                "message_id": None,
                "text_hash": None,
                "error": None,
                "attempts": 1,
            },
            "new": {
                "idempotency_key": "new",
                "chat_id": "1",
                "brief_date": "2026-08-04",
                "status": "sent",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "sent_at": None,
                "message_id": None,
                "text_hash": None,
                "error": None,
                "attempts": 1,
            },
        }
        self.store.store_path.write_text(json.dumps(old_data))

        removed = self.store.cleanup(max_age_days=30)
        self.assertGreaterEqual(removed, 1)
        self.assertIsNone(self.store.get("old"))
        self.assertIsNotNone(self.store.get("new"))

    def test_compute_text_hash(self):
        """文本 hash 一致且稳定。"""
        h1 = compute_text_hash("hello")
        h2 = compute_text_hash("hello")
        h3 = compute_text_hash("world")
        self.assertEqual(h1, h2)
        self.assertNotEqual(h1, h3)
        self.assertEqual(len(h1), 16)

    def test_persistence(self):
        """收据跨实例持久化。"""
        self.store.put(SendReceipt(
            idempotency_key="persist", chat_id="1", brief_date="2026-08-04", status="sent",
        ))
        # 创建新实例读取同一文件
        store2 = ReceiptStore(self.store_path)
        fetched = store2.get("persist")
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.status, "sent")


# ══════════════════════════════════════════════════════════════
# Circuit Breaker
# ══════════════════════════════════════════════════════════════
class TestCircuitBreaker(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_path = Path(self.tmpdir) / "circuit.json"
        self.current = datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc)
        self.cb = self._breaker()

    def _breaker(self):
        return CircuitBreaker(
            self.state_path,
            clock=FrozenClock(self.current),
            timezone_name="UTC",
        )

    def _next_day(self):
        self.current += timedelta(days=1)
        self.cb.clock = FrozenClock(self.current)

    def test_initial_state(self):
        """初始状态：未停止、允许执行。"""
        allowed, reason = self.cb.check()
        self.assertTrue(allowed)
        self.assertIsNone(reason)

    def test_record_failure(self):
        """记录失败增加计数。"""
        self.cb.record_failure("weather_fetch", "timeout")
        self.assertEqual(self.cb.state.consecutive_failures, 1)
        allowed, _ = self.cb.check()
        self.assertTrue(allowed)

    def test_record_success_resets(self):
        """成功后重置连续失败计数。"""
        self.cb.record_failure("weather_fetch", "timeout")
        self.cb.record_failure("aqi_fetch", "timeout")
        self.cb.record_success()
        self.assertEqual(self.cb.state.consecutive_failures, 0)

    def test_stop_after_5_failures(self):
        """5 个连续自然日失败后停止。"""
        for i in range(STOP_CONSECUTIVE_FAILURES):
            self.cb.record_failure("weather_fetch", f"timeout #{i}")
            self._next_day()

        allowed, reason = self.cb.check()
        self.assertFalse(allowed)
        self.assertIn("连续", reason)
        self.assertTrue(self.cb.state.is_stopped)

    def test_escalate_after_3_same_cause(self):
        """3 天同根因触发升级告警。"""
        for i in range(ESCALATE_CONSECUTIVE_DAYS):
            self.cb.record_failure("weather_fetch", f"day {i}")
            self._next_day()
        self.assertTrue(self.cb.should_escalate())
        self.assertEqual(self.cb.escalation_cause(), "weather_fetch")

    def test_no_escalate_different_causes(self):
        """不同根因不触发升级。"""
        self.cb.record_failure("weather_fetch", "d1")
        self._next_day()
        self.cb.record_failure("aqi_fetch", "d2")
        self._next_day()
        self.cb.record_failure("weather_fetch", "d3")
        self.assertFalse(self.cb.should_escalate())

    def test_reset(self):
        """人工重置解除停止。"""
        for i in range(STOP_CONSECUTIVE_FAILURES):
            self.cb.record_failure("weather_fetch", f"fail {i}")
            self._next_day()
        self.cb.reset()
        allowed, _ = self.cb.check()
        self.assertTrue(allowed)
        self.assertEqual(self.cb.state.consecutive_failures, 0)

    def test_persistence(self):
        """状态跨实例持久化。"""
        self.cb.record_failure("weather_fetch", "timeout")
        cb2 = self._breaker()
        self.assertEqual(cb2.state.consecutive_failures, 1)

    def test_stop_persists_across_instances(self):
        """停止状态跨实例保持。"""
        for i in range(STOP_CONSECUTIVE_FAILURES):
            self.cb.record_failure("weather_fetch", f"fail {i}")
            self._next_day()
        cb2 = self._breaker()
        allowed, _ = cb2.check()
        self.assertFalse(allowed)


class TestCircuitState(unittest.TestCase):
    """CircuitState 单元测试。"""

    def test_record_failure_increments(self):
        state = CircuitState()
        state.record_failure("test", "detail", date(2026, 8, 1), datetime(2026, 8, 1, tzinfo=timezone.utc))
        self.assertEqual(state.consecutive_failures, 1)
        self.assertEqual(len(state.failures), 1)

    def test_record_failure_triggers_stop(self):
        state = CircuitState()
        for i in range(STOP_CONSECUTIVE_FAILURES):
            day = date(2026, 8, 1) + timedelta(days=i)
            state.record_failure("test", f"detail {i}", day, datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc))
        self.assertTrue(state.is_stopped)
        self.assertIsNotNone(state.stopped_at)

    def test_record_success_resets(self):
        state = CircuitState()
        state.record_failure("test", "detail", date(2026, 8, 1), datetime(2026, 8, 1, tzinfo=timezone.utc))
        state.record_failure("test", "detail", date(2026, 8, 2), datetime(2026, 8, 2, tzinfo=timezone.utc))
        state.record_success()
        self.assertEqual(state.consecutive_failures, 0)

    def test_should_escalate_true(self):
        state = CircuitState()
        for i in range(ESCALATE_CONSECUTIVE_DAYS):
            day = date(2026, 8, 1) + timedelta(days=i)
            state.record_failure("same_cause", "detail", day, datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc))
        self.assertTrue(state.should_escalate())

    def test_should_escalate_false_different(self):
        state = CircuitState()
        causes = ["a", "b", "c"]
        for i, c in enumerate(causes):
            day = date(2026, 8, 1) + timedelta(days=i)
            state.record_failure(c, "detail", day, datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc))
        self.assertFalse(state.should_escalate())

    def test_failure_history_limit(self):
        state = CircuitState()
        for i in range(35):
            day = date(2026, 1, 1) + timedelta(days=i)
            state.record_failure("test", f"detail {i}", day, datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc))
        self.assertEqual(len(state.failures), 30)


# ══════════════════════════════════════════════════════════════
# Sender
# ══════════════════════════════════════════════════════════════
class TestSender(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.receipt_store = ReceiptStore(Path(self.tmpdir) / "receipts.json")
        self.transport = FakeTransport()
        self.sender = Sender(
            self.receipt_store,
            Config(send_enabled=True, location_is_placeholder=False),
            transport=self.transport,
        )
        # 闸门检查需要标题与 apply_custom_emoji(TITLE_PREFIX) 一致
        self.title_with_emoji = apply_custom_emoji(TITLE_PREFIX)

    def _make_text(self, chat_id="12345", text=None):
        if text is None:
            text = run_pipeline(target_date=date(2026, 8, 4)).composed.text
        return text

    def _make_brief(self, chat_id="12345", text=None):
        return create_final_brief(
            text=self._make_text(chat_id=chat_id, text=text),
            account_id="life",
            chat_id=chat_id,
            brief_date="2026-08-04",
        )

    def test_send_success(self):
        """首次发送成功。"""
        brief = self._make_brief()
        result = self.sender.send(brief)
        self.assertTrue(result.success)
        self.assertIsNotNone(result.message_id)
        self.assertEqual(result.receipt_status, "sent")

    def test_send_writes_receipt(self):
        """发送后写入 sent 收据。"""
        brief = self._make_brief()
        self.sender.send(brief)

        receipt = self.receipt_store.get(brief.idempotency_key)
        self.assertIsNotNone(receipt)
        self.assertEqual(receipt.status, "sent")
        self.assertEqual(receipt.attempts, 1)

    def test_send_idempotent_skip(self):
        """重复发送被幂等跳过。"""
        brief = self._make_brief()
        result1 = self.sender.send(brief)
        self.assertTrue(result1.success)

        result2 = self.sender.send(brief)
        self.assertTrue(result2.success)
        self.assertTrue(result2.was_duplicate)
        self.assertEqual(result2.message_id, result1.message_id)

    def test_send_gate_reject_empty_text(self):
        """空文本被闸门拒绝。"""
        brief = self._make_brief(text="   ")
        result = self.sender.send(brief)
        self.assertFalse(result.success)
        self.assertIn("gate_rejected", result.error)
        self.assertTrue(len(result.gate_errors) > 0)

    def test_send_gate_reject_no_title(self):
        """缺少抬头的文本被闸门拒绝。"""
        brief = self._make_brief(text="没有标题的正文")
        result = self.sender.send(brief)
        self.assertFalse(result.success)

    def test_send_gate_reject_oversize(self):
        """超长文本被闸门拒绝。"""
        huge_text = "🌈👠🫦👅合欢宗 · 晨间玉简🧛💍💄🦄\n─────────\n" + "x" * 5000
        brief = self._make_brief(text=huge_text)
        result = self.sender.send(brief)
        self.assertFalse(result.success)

    def test_send_failed_receipt(self):
        """发送结果不明确时进入人工核对，禁止自动重发。"""
        brief = self._make_brief()
        self.sender.transport = FakeTransport(AmbiguousDeliveryError("network error"))
        result = self.sender.send(brief)
        self.assertFalse(result.success)
        self.assertEqual(result.receipt_status, "unknown_needs_reconcile")
        receipt = self.receipt_store.get(brief.idempotency_key)
        self.assertEqual(receipt.status, "unknown_needs_reconcile")
        self.assertIn("network error", receipt.error)

    def test_pending_receipt_logged(self):
        """pending 收据必须阻止重发并进入人工核对。"""
        brief = self._make_brief()
        # 先写一个 pending 收据
        self.receipt_store.put(SendReceipt(
            idempotency_key=brief.idempotency_key,
            chat_id=brief.chat_id,
            brief_date="2026-08-04",
            status="pending",
            attempts=1,
        ))
        result = self.sender.send(brief)
        self.assertFalse(result.success)
        self.assertFalse(result.was_duplicate)
        self.assertEqual(result.receipt_status, "unknown_needs_reconcile")
        self.assertEqual(self.transport.calls, 0)


# ══════════════════════════════════════════════════════════════
# Scheduler Integration
# ══════════════════════════════════════════════════════════════
class TestScheduler(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.data_dir = Path(self.tmpdir)

    def _make_scheduler(self, **kwargs):
        kwargs.setdefault(
            "config", Config(send_enabled=True, location_is_placeholder=False)
        )
        kwargs.setdefault("transport", FakeTransport())
        return Scheduler(data_dir=self.data_dir, **kwargs)

    def _mock_weather_success(self):
        """mock 天气成功返回（Open-Meteo 主源）。"""
        result = DataSourceResult(
            source="open-meteo",
            data=WeatherData(
                temperature_c=22.0,
                daily_max_temp=25.0,
                daily_min_temp=18.0,
            ),
            is_degraded=False,
        )
        return patch(
            "hehuan_daily.weather.WeatherSource.fetch",
            return_value=result,
        )

    def _mock_aqi_success(self):
        """mock AQI 成功返回（CAMS 降级）。"""
        result = DataSourceResult(
            source="cams-model",
            data=AQIData(aqi=50, level=AQILevel.GOOD, pm25=12.0),
            is_degraded=True,
        )
        return patch(
            "hehuan_daily.aqi.AQISource.fetch",
            return_value=result,
        )

    def _mock_lunar_success(self):
        """mock 黄历成功返回。"""
        result = DataSourceResult(
            source="lunar-builtin",
            data=LunarData(
                solar_date=date.today(),
                lunar_year=2026,
                lunar_month=6,
                lunar_day=20,
            ),
        )
        return patch(
            "hehuan_daily.lunar.LunarSource.fetch",
            return_value=result,
        )

    def test_run_success(self):
        """完整调度成功。"""
        scheduler = self._make_scheduler()

        with self._mock_weather_success(), \
             self._mock_aqi_success(), \
             self._mock_lunar_success():
            result = scheduler.run(
                target_date=date.today(),
                chat_id="12345",
                account_id="life",
            )

        self.assertTrue(result.success)
        self.assertEqual(result.status, "sent")
        self.assertTrue(result.idempotency_key.endswith(":v2"))
        self.assertIn("aqi", result.degraded_modules)  # CAMS 降级

    def test_run_idempotent_skip(self):
        """重复运行被幂等跳过。"""
        scheduler = self._make_scheduler()

        with self._mock_weather_success(), \
             self._mock_aqi_success(), \
             self._mock_lunar_success():
            result1 = scheduler.run(
                target_date=date.today(), chat_id="12345", account_id="life",
            )
            result2 = scheduler.run(
                target_date=date.today(), chat_id="12345", account_id="life",
            )

        self.assertEqual(result1.status, "sent")
        self.assertEqual(result2.status, "skipped_duplicate")
        self.assertTrue(result2.was_duplicate)

    def test_run_weather_degraded(self):
        """天气降级到备源。"""
        scheduler = self._make_scheduler()
        result = DataSourceResult(
            source="met-norway",
            data=WeatherData(temperature_c=20.0),
            is_degraded=True,
        )

        with patch("hehuan_daily.weather.WeatherSource.fetch", return_value=result), \
             self._mock_aqi_success(), \
             self._mock_lunar_success():
            r = scheduler.run(
                target_date=date.today(), chat_id="12345", account_id="life",
            )

        self.assertTrue(r.success)
        self.assertIn("weather", r.degraded_modules)

    def test_run_weather_failed_graceful(self):
        """天气完全失败时继续发送（标记失败模块）。"""
        scheduler = self._make_scheduler()

        with patch(
            "hehuan_daily.weather.WeatherSource.fetch",
            side_effect=Exception("network down"),
        ), self._mock_aqi_success(), self._mock_lunar_success():
            r = scheduler.run(
                target_date=date.today(), chat_id="12345", account_id="life",
            )

        # 天气失败但 pipeline 仍能产出简报（weather 模块 resolve 返回 False）
        self.assertTrue(r.success)
        self.assertIn("weather", r.failed_modules)

    def test_run_all_data_fail_still_composes(self):
        """所有数据源失败时仍能排版（至少黄历模块会输出）。"""
        scheduler = self._make_scheduler()

        with patch(
            "hehuan_daily.weather.WeatherSource.fetch",
            side_effect=Exception("fail"),
        ), patch(
            "hehuan_daily.aqi.AQISource.fetch",
            side_effect=Exception("fail"),
        ), patch(
            "hehuan_daily.lunar.LunarSource.fetch",
            side_effect=Exception("fail"),
        ):
            r = scheduler.run(
                target_date=date.today(), chat_id="12345", account_id="life",
            )

        # 所有模块无数据 → 简报内容极少但仍应成功
        self.assertIn("weather", r.failed_modules)
        self.assertIn("aqi", r.failed_modules)
        self.assertIn("lunar", r.failed_modules)

    def test_circuit_breaker_stops_after_5(self):
        """同日五次失败不会误判为五个连续失败日。"""
        clock = FrozenClock(datetime(2026, 8, 1, tzinfo=timezone.utc))
        scheduler = self._make_scheduler(clock=clock)

        # 模拟每次发送都失败
        with patch.object(scheduler.sender, "send", return_value=SendResult(
            success=False, error="send failed", receipt_status="failed_safe_to_retry",
        )):
            for i in range(5):
                with self._mock_weather_success(), \
                     self._mock_aqi_success(), \
                     self._mock_lunar_success():
                    r = scheduler.run(
                        target_date=date.today(),
                        chat_id=str(10000 + i),  # 不同合法 chat 避免幂等
                        account_id="life",
                    )

        # 同一天五次失败只算一个失败日，不应长期停发。
        allowed, reason = scheduler.circuit_breaker.check()
        self.assertTrue(allowed)
        self.assertEqual(scheduler.circuit_breaker.state.consecutive_failures, 1)

    def test_circuit_breaker_escalation_warning(self):
        """3 天同根因触发升级告警。"""
        scheduler = self._make_scheduler()

        with patch.object(scheduler.sender, "send", return_value=SendResult(
            success=False, error="gate_rejected: bad title", receipt_status="failed_safe_to_retry",
            gate_errors=["title mismatch"],
        )):
            for i in range(3):
                scheduler.circuit_breaker.clock = FrozenClock(
                    datetime(2026, 8, 1 + i, tzinfo=timezone.utc)
                )
                with self._mock_weather_success(), \
                     self._mock_aqi_success(), \
                     self._mock_lunar_success():
                    r = scheduler.run(
                        target_date=date.today(),
                        chat_id=str(20000 + i),
                        account_id="life",
                    )

        # 第 3 次应触发升级告警
        self.assertIsNotNone(r.escalation_warning)
        self.assertIn("连续 3 天", r.escalation_warning)


# ══════════════════════════════════════════════════════════════
# Idempotency Key Format
# ══════════════════════════════════════════════════════════════
class TestIdempotencyKey(unittest.TestCase):
    def test_build_key_format(self):
        """幂等键格式正确。"""
        key = build_idempotency_key("12345", "2026-08-04")
        self.assertEqual(key, "morning-brief:12345:2026-08-04:v1")

    def test_build_key_with_version(self):
        """自定义版本号。"""
        key = build_idempotency_key("-987654321", "2026-08-04", version=2)
        self.assertEqual(key, "morning-brief:-987654321:2026-08-04:v2")

    def test_key_matches_pattern(self):
        """键格式匹配 schema 正则。"""
        import re
        pattern = re.compile(
            r"^morning-brief:-?[0-9]+:\d{4}-\d{2}-\d{2}:v\d+$"
        )
        self.assertTrue(pattern.match(build_idempotency_key("123", "2026-08-04")))
        self.assertTrue(pattern.match(build_idempotency_key("-456", "2026-01-01")))


if __name__ == "__main__":
    unittest.main()

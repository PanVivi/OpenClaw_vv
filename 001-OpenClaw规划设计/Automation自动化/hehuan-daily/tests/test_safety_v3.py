"""v0.3 安全回归：禁止假成功、重复发送和同日误熔断。"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from hehuan_daily.circuit_breaker import CircuitBreaker
from hehuan_daily.clock import FrozenClock
from hehuan_daily.cli import failure_notice_text, offline_preview, send_failure_notice
from hehuan_daily.composer import apply_custom_emoji
from hehuan_daily.config import Config
from hehuan_daily.constants import TITLE_PREFIX
from hehuan_daily.final_brief import create_final_brief, final_gate_check
from hehuan_daily.idempotency import ReceiptStore, ReceiptStoreCorruptionError
from hehuan_daily.pipeline import run_pipeline
from hehuan_daily.sender import (
    AmbiguousDeliveryError,
    DefiniteDeliveryError,
    OpenClawCliTransport,
    Sender,
    TransportResult,
)
from hehuan_daily.state_store import AtomicJSONStore


class FakeTransport:
    def __init__(self, error=None):
        self.error = error
        self.calls = 0

    def send(self, brief):
        self.calls += 1
        if self.error:
            raise self.error
        return TransportResult(message_id=f"telegram-{self.calls}")


def make_brief(day="2026-08-04"):
    return create_final_brief(
        text=run_pipeline(target_date=date.fromisoformat(day)).composed.text,
        account_id="life",
        chat_id="12345",
        brief_date=day,
    )


class TestConfigSafety(unittest.TestCase):
    def test_offline_preview_accepts_example_placeholder_without_sending(self):
        text = offline_preview(
            date(2026, 8, 4), "life", "REQUIRED_NUMERIC_TELEGRAM_CHAT_ID"
        )
        self.assertIn("不外发的离线验收预览", text)

    def test_failure_notice_is_natural_and_hides_engineering_terms(self):
        for status in ("failed", "unknown", "blocked_circuit"):
            text = failure_notice_text(status)
            self.assertIn("少主", text)
            self.assertNotIn("Card", text)
            self.assertNotIn("Task", text)
            self.assertNotIn("Gateway", text)

    def test_failure_notice_has_independent_idempotency_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            cfg = Config(
                data_dir=directory,
                send_enabled=True,
                failure_notice_enabled=True,
                location_is_placeholder=False,
            )
            transport = FakeTransport()
            first = send_failure_notice(
                status="failed",
                target_date=date(2026, 8, 4),
                config=cfg,
                account_id="life",
                chat_id="12345",
                transport=transport,
            )
            second = send_failure_notice(
                status="failed",
                target_date=date(2026, 8, 4),
                config=cfg,
                account_id="life",
                chat_id="12345",
                transport=transport,
            )
            self.assertTrue(first.success)
            self.assertTrue(second.was_duplicate)
            self.assertEqual(transport.calls, 1)

    def test_custom_data_dir_derives_all_children(self):
        cfg = Config(data_dir="/tmp/hehuan")
        self.assertEqual(cfg.template_dir, "/tmp/hehuan/templates")
        self.assertEqual(cfg.override_dir, "/tmp/hehuan/overrides")

    def test_real_send_rejects_placeholder_location(self):
        cfg = Config(send_enabled=True)
        self.assertTrue(cfg.validate_for_real_send("life", "12345"))

    def test_real_send_requires_life_and_numeric_chat(self):
        cfg = Config(send_enabled=True, location_is_placeholder=False)
        errors = cfg.validate_for_real_send("default", "0")
        self.assertGreaterEqual(len(errors), 2)


class TestSenderSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = ReceiptStore(Path(self.temp.name) / "receipts.json")

    def test_dry_run_never_creates_sent_receipt(self):
        sender = Sender(self.store, Config(send_enabled=False))
        result = sender.send(make_brief())
        self.assertTrue(result.was_no_send)
        self.assertIsNone(result.message_id)
        self.assertEqual(
            self.store.get(make_brief().idempotency_key).status, "not_sent"
        )

    def test_ambiguous_delivery_blocks_second_attempt(self):
        transport = FakeTransport(AmbiguousDeliveryError("timeout"))
        sender = Sender(
            self.store,
            Config(send_enabled=True, location_is_placeholder=False),
            transport=transport,
        )
        first = sender.send(make_brief())
        second = sender.send(make_brief())
        self.assertEqual(first.receipt_status, "unknown_needs_reconcile")
        self.assertEqual(second.receipt_status, "unknown_needs_reconcile")
        self.assertEqual(transport.calls, 1)

    def test_definite_failure_can_retry(self):
        sender = Sender(
            self.store,
            Config(send_enabled=True, location_is_placeholder=False),
            transport=FakeTransport(DefiniteDeliveryError("cli missing")),
        )
        first = sender.send(make_brief())
        self.assertEqual(first.receipt_status, "failed_safe_to_retry")
        sender.transport = FakeTransport()
        second = sender.send(make_brief())
        self.assertTrue(second.success)
        self.assertEqual(second.message_id, "telegram-1")

    def test_date_is_explicit_and_must_match_key(self):
        brief = make_brief()
        object.__setattr__(brief, "brief_date", "2026-08-05")
        self.assertTrue(
            any("不一致" in item for item in final_gate_check(brief, TITLE_PREFIX))
        )

    def test_cli_transport_requires_structured_message_id(self):
        completed = type(
            "Completed",
            (),
            {"returncode": 0, "stdout": json.dumps({"messageId": 77}), "stderr": ""},
        )()
        with patch("subprocess.run", return_value=completed) as run:
            result = OpenClawCliTransport().send(make_brief())
        self.assertEqual(result.message_id, "77")
        self.assertFalse(run.call_args.kwargs["shell"])


class TestCircuitSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.start = datetime(2026, 8, 1, tzinfo=timezone.utc)
        self.cb = CircuitBreaker(
            Path(self.temp.name) / "circuit.json",
            clock=FrozenClock(self.start),
            timezone_name="UTC",
        )

    def test_same_day_many_failures_count_once(self):
        for _ in range(20):
            self.cb.record_failure("network", "timeout")
        self.assertEqual(self.cb.state.consecutive_failures, 1)
        self.assertTrue(self.cb.check()[0])

    def test_five_consecutive_days_stop(self):
        for offset in range(5):
            self.cb.clock = FrozenClock(self.start + timedelta(days=offset))
            self.cb.record_failure("network", "timeout")
        self.assertFalse(self.cb.check()[0])

    def test_gap_resets_consecutive_days(self):
        self.cb.record_failure("network", "d1")
        self.cb.clock = FrozenClock(self.start + timedelta(days=2))
        self.cb.record_failure("network", "d3")
        self.assertEqual(self.cb.state.consecutive_failures, 1)

    def test_three_consecutive_days_same_cause_escalate(self):
        for offset in range(3):
            self.cb.clock = FrozenClock(self.start + timedelta(days=offset))
            self.cb.record_failure("network", "timeout")
        self.assertTrue(self.cb.should_escalate())


class TestAtomicState(unittest.TestCase):
    def test_threaded_updates_do_not_lose_counts(self):
        with tempfile.TemporaryDirectory() as temp:
            store = AtomicJSONStore(Path(temp) / "state.json", lambda: {"n": 0})

            def worker():
                for _ in range(25):
                    store.update(lambda data: data.__setitem__("n", data["n"] + 1))

            threads = [threading.Thread(target=worker) for _ in range(4)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()
            self.assertEqual(store.read()["n"], 100)

    def test_corrupt_receipt_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "receipts.json"
            path.write_text("{broken", encoding="utf-8")
            store = ReceiptStore(path)
            with self.assertRaises(ReceiptStoreCorruptionError):
                store.get("any")


if __name__ == "__main__":
    unittest.main()

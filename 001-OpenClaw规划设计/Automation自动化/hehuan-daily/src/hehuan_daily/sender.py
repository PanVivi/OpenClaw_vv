"""final-only 发送闸门、幂等收据与 OpenClaw Telegram transport。"""

from __future__ import annotations

import json
import logging
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Protocol

from .config import Config, default_config
from .constants import TITLE_PREFIX
from .exceptions import DataSourceError
from .final_brief import FinalBrief, create_final_brief, final_gate_check
from .idempotency import ReceiptStore, ReceiptStoreError, SendReceipt, compute_text_hash

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TransportResult:
    message_id: str


class MessageTransport(Protocol):
    def send(self, brief: FinalBrief) -> TransportResult: ...


class DefiniteDeliveryError(RuntimeError):
    """请求明确没有提交到 Telegram，可在修正根因后安全重试。"""


class AmbiguousDeliveryError(RuntimeError):
    """请求可能已经提交，必须先核对，禁止自动重发。"""


def _find_message_id(value) -> Optional[str]:
    if isinstance(value, dict):
        for key in ("messageId", "message_id"):
            candidate = value.get(key)
            if isinstance(candidate, (str, int)) and str(candidate):
                return str(candidate)
        for child in value.values():
            found = _find_message_id(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = _find_message_id(child)
            if found:
                return found
    return None


class OpenClawCliTransport:
    """复用 OpenClaw 已配置的 Telegram account，不接触 Bot token。"""

    def __init__(self, executable: str = "openclaw", timeout_seconds: float = 45.0):
        self.executable = executable
        self.timeout_seconds = timeout_seconds

    def send(self, brief: FinalBrief) -> TransportResult:
        command = [
            self.executable,
            "message",
            "send",
            "--channel",
            "telegram",
            "--account",
            brief.account_id,
            "--target",
            brief.chat_id,
            "--message",
            brief.text,
            "--json",
        ]
        try:
            completed = subprocess.run(
                command,
                check=False,
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                shell=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise AmbiguousDeliveryError("OpenClaw message send timed out") from exc
        except OSError as exc:
            raise DefiniteDeliveryError(f"OpenClaw CLI could not start: {exc}") from exc

        if completed.returncode != 0:
            # CLI 非零退出时不能证明请求未到 Telegram，保守进入核对状态。
            detail = (completed.stderr or completed.stdout or "message send failed").strip()
            raise AmbiguousDeliveryError(detail[:500])
        try:
            payload = json.loads(completed.stdout)
        except json.JSONDecodeError as exc:
            raise AmbiguousDeliveryError("OpenClaw returned non-JSON delivery result") from exc
        message_id = _find_message_id(payload)
        if not message_id:
            raise AmbiguousDeliveryError("OpenClaw result did not include a message id")
        return TransportResult(message_id=message_id)


@dataclass
class SendResult:
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    was_duplicate: bool = False
    gate_errors: list[str] = field(default_factory=list)
    receipt_status: Optional[str] = None
    was_no_send: bool = False


class SendGateError(DataSourceError):
    pass


class Sender:
    def __init__(
        self,
        receipt_store: ReceiptStore,
        config: Optional[Config] = None,
        gate_expected_title: str = TITLE_PREFIX,
        transport: Optional[MessageTransport] = None,
    ):
        self.receipt_store = receipt_store
        self.config = config or default_config
        self.gate_expected_title = gate_expected_title
        self.transport = transport

    def send(self, brief: FinalBrief) -> SendResult:
        try:
            existing = self.receipt_store.get(brief.idempotency_key)
        except ReceiptStoreError as exc:
            return self._unknown(f"manual_check_required: {exc}")

        if existing and existing.status == "sent":
            return SendResult(
                success=True,
                message_id=existing.message_id,
                was_duplicate=True,
                receipt_status="sent",
            )
        if existing and existing.status in (
            "pending", "unknown", "unknown_needs_reconcile"
        ):
            return self._unknown(
                "manual_check_required: existing delivery must be reconciled"
            )

        gate_errors = final_gate_check(brief, self.gate_expected_title)
        if self.config.send_enabled:
            gate_errors.extend(
                self.config.validate_for_real_send(brief.account_id, brief.chat_id)
            )
        if gate_errors:
            error = "; ".join(dict.fromkeys(gate_errors))
            try:
                self._write_receipt(brief, "failed_safe_to_retry", error=error)
            except ReceiptStoreError as exc:
                return self._unknown(f"manual_check_required: {exc}")
            return SendResult(
                success=False,
                error=f"gate_rejected: {error}",
                gate_errors=gate_errors,
                receipt_status="failed_safe_to_retry",
            )

        if not self.config.send_enabled:
            try:
                self._write_receipt(
                    brief,
                    "not_sent",
                    error="dry-run: no external request made",
                )
            except ReceiptStoreError as exc:
                return self._unknown(f"manual_check_required: {exc}")
            return SendResult(
                success=True,
                error="dry-run: sending disabled",
                receipt_status="not_sent",
                was_no_send=True,
            )

        if self.transport is None:
            error = "real sending enabled but no transport was installed"
            self._write_receipt(brief, "failed_safe_to_retry", error=error)
            return SendResult(
                success=False,
                error=error,
                receipt_status="failed_safe_to_retry",
            )

        try:
            self._write_receipt(brief, "pending")
            delivered = self.transport.send(brief)
            if not delivered.message_id:
                raise AmbiguousDeliveryError("transport returned an empty message id")
        except DefiniteDeliveryError as exc:
            self._write_receipt(
                brief, "failed_safe_to_retry", error=str(exc), preserve_attempt=True
            )
            return SendResult(
                success=False,
                error=str(exc),
                receipt_status="failed_safe_to_retry",
            )
        except (AmbiguousDeliveryError, TimeoutError) as exc:
            self._write_receipt(
                brief, "unknown_needs_reconcile", error=str(exc), preserve_attempt=True
            )
            return self._unknown(str(exc))
        except Exception as exc:
            # 未分类异常不能证明 Telegram 未收到。
            self._write_receipt(
                brief, "unknown_needs_reconcile", error=str(exc), preserve_attempt=True
            )
            return self._unknown(str(exc))

        self._write_receipt(
            brief,
            "sent",
            message_id=delivered.message_id,
            preserve_attempt=True,
        )
        return SendResult(
            success=True,
            message_id=delivered.message_id,
            receipt_status="sent",
        )

    def _unknown(self, error: str) -> SendResult:
        return SendResult(
            success=False,
            error=error,
            receipt_status="unknown_needs_reconcile",
        )

    def _write_receipt(
        self,
        brief: FinalBrief,
        status: str,
        message_id: Optional[str] = None,
        error: Optional[str] = None,
        preserve_attempt: bool = False,
    ) -> None:
        existing = self.receipt_store.get(brief.idempotency_key)
        if existing is None:
            attempts = 1 if status == "pending" else 0
            created_at = datetime.now(timezone.utc).isoformat()
        else:
            created_at = existing.created_at
            attempts = existing.attempts
            if status == "pending" and not preserve_attempt:
                attempts += 1
        receipt = SendReceipt(
            idempotency_key=brief.idempotency_key,
            chat_id=brief.chat_id,
            brief_date=brief.brief_date,
            status=status,
            created_at=created_at,
            sent_at=(
                datetime.now(timezone.utc).isoformat() if status == "sent" else None
            ),
            message_id=message_id,
            text_hash=compute_text_hash(brief.text),
            error=error,
            attempts=attempts,
        )
        self.receipt_store.put(receipt)


def build_final_brief(
    composed_text: str,
    account_id: str,
    chat_id: str,
    brief_date: str,
    version: int = 1,
) -> FinalBrief:
    return create_final_brief(
        text=composed_text,
        account_id=account_id,
        chat_id=chat_id,
        brief_date=brief_date,
        version=version,
    )


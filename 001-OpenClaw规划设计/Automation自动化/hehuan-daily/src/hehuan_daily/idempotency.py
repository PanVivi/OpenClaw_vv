"""幂等收据：发送记录与幂等键管理。"""

from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .state_store import AtomicJSONStore, StateStoreCorruptionError, StateStoreError


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class SendReceipt:
    """发送收据：记录一次简报发送的状态。"""

    idempotency_key: str
    chat_id: str
    brief_date: str
    status: str  # pending | unknown_needs_reconcile | sent | failed_safe_to_retry | not_sent
    created_at: str = field(default_factory=_utc_now_iso)
    updated_at: str = field(default_factory=_utc_now_iso)
    sent_at: Optional[str] = None
    message_id: Optional[str] = None
    text_hash: Optional[str] = None  # 发送内容的 hash，用于核对
    error: Optional[str] = None
    attempts: int = 0  # 尝试次数

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> SendReceipt:
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


class ReceiptStoreError(RuntimeError):
    """收据存储不可安全读取或写入。"""


class ReceiptStoreCorruptionError(ReceiptStoreError):
    """收据文件损坏，必须人工核对后才能继续。"""


class ReceiptStore:
    """文件收据存储：持久化发送记录。"""

    def __init__(self, store_path: Path | str):
        self.store_path = Path(store_path)
        self._store = AtomicJSONStore(self.store_path, dict)

    def _load(self) -> dict:
        try:
            data = self._store.read()
        except StateStoreCorruptionError as exc:
            raise ReceiptStoreCorruptionError(
                f"收据文件不可读取，需人工核对: {self.store_path}"
            ) from exc
        except StateStoreError as exc:
            raise ReceiptStoreError(str(exc)) from exc
        return data

    def get(self, idempotency_key: str) -> Optional[SendReceipt]:
        """获取指定幂等键的收据。"""
        data = self._load()
        if idempotency_key in data:
            return SendReceipt.from_dict(data[idempotency_key])
        return None

    def put(self, receipt: SendReceipt) -> None:
        """写入或更新收据。"""
        receipt.updated_at = _utc_now_iso()
        try:
            self._store.update(
                lambda data: data.__setitem__(receipt.idempotency_key, receipt.to_dict())
            )
        except StateStoreCorruptionError as exc:
            raise ReceiptStoreCorruptionError(str(exc)) from exc
        except StateStoreError as exc:
            raise ReceiptStoreError(str(exc)) from exc

    def is_sent(self, idempotency_key: str) -> bool:
        """检查是否已成功发送。"""
        receipt = self.get(idempotency_key)
        return receipt is not None and receipt.status == "sent"

    def has_pending(self, idempotency_key: str) -> bool:
        """检查是否存在 pending 状态的收据（超时/断线遗留）。"""
        receipt = self.get(idempotency_key)
        return receipt is not None and receipt.status in (
            "pending", "unknown_needs_reconcile", "unknown"
        )

    def cleanup(self, max_age_days: int = 30) -> int:
        """清理超过 max_age_days 的旧收据。返回清理数量。"""
        def mutate(data: dict) -> int:
            now = datetime.now(timezone.utc)
            to_remove = []
            for key, val in data.items():
                try:
                    updated = datetime.fromisoformat(val.get("updated_at", ""))
                    if updated.tzinfo is None:
                        updated = updated.replace(tzinfo=timezone.utc)
                    if (now - updated).days > max_age_days:
                        to_remove.append(key)
                except (ValueError, TypeError):
                    pass
            for key in to_remove:
                del data[key]
            return len(to_remove)
        try:
            return self._store.update(mutate)
        except StateStoreCorruptionError as exc:
            raise ReceiptStoreCorruptionError(str(exc)) from exc
        except StateStoreError as exc:
            raise ReceiptStoreError(str(exc)) from exc


def compute_text_hash(text: str) -> str:
    """计算文本的短 hash（用于收据核对）。"""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]

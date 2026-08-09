"""跨进程安全的原子 JSON 状态存储。"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, TypeVar

from .lock import file_lock

T = TypeVar("T")


class StateStoreError(RuntimeError):
    pass


class StateStoreCorruptionError(StateStoreError):
    pass


def _fsync_directory(path: Path) -> None:
    """在支持目录 fsync 的平台同步 rename 元数据。"""
    if os.name == "nt":
        return
    fd = os.open(path, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


class AtomicJSONStore:
    def __init__(self, path: Path | str, default_factory: Callable[[], dict]):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.path.parent, 0o700)
        except OSError:
            pass
        self.lock_path = self.path.with_name(f".{self.path.name}.lock")
        self.default_factory = default_factory
        with file_lock(self.lock_path):
            if not self.path.exists():
                self._write_unlocked(default_factory())

    def _read_unlocked(self) -> dict:
        try:
            value = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            evidence = self.path.with_name(f"{self.path.name}.corrupt-{stamp}")
            try:
                shutil.copy2(self.path, evidence)
                os.chmod(evidence, 0o600)
            except OSError:
                pass
            raise StateStoreCorruptionError(
                f"状态文件损坏，已保留核对副本: {self.path}"
            ) from exc
        except OSError as exc:
            raise StateStoreCorruptionError(
                f"状态文件不可安全读取，需人工核对: {self.path}"
            ) from exc
        if not isinstance(value, dict):
            raise StateStoreCorruptionError(
                f"状态文件不是 JSON object，需人工核对: {self.path}"
            )
        return value

    def _write_unlocked(self, value: dict) -> None:
        payload = json.dumps(value, ensure_ascii=False, indent=2).encode("utf-8")
        fd, temp_name = tempfile.mkstemp(
            prefix=f".{self.path.name}.", suffix=".tmp", dir=self.path.parent
        )
        temp_path = Path(temp_name)
        try:
            os.chmod(temp_path, 0o600)
            with os.fdopen(fd, "wb", closefd=True) as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_path, self.path)
            os.chmod(self.path, 0o600)
            _fsync_directory(self.path.parent)
        except BaseException:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass
            raise

    def read(self) -> dict:
        with file_lock(self.lock_path):
            return self._read_unlocked()

    def update(self, mutator: Callable[[dict], T]) -> T:
        with file_lock(self.lock_path):
            value = self._read_unlocked()
            result = mutator(value)
            self._write_unlocked(value)
            return result

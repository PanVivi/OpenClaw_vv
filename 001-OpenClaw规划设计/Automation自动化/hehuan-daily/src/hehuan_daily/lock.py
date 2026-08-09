"""跨平台文件锁：防止调度与状态写入并发。"""

from __future__ import annotations

import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

if os.name == "nt":
    import msvcrt
else:
    import fcntl


class LockError(Exception):
    """锁获取失败。"""


@contextmanager
def file_lock(
    lock_path: Path | str,
    timeout: float = 30.0,
    poll_interval: float = 0.5,
) -> Generator[int, None, None]:
    """文件锁上下文管理器。

    POSIX 使用 flock，Windows 使用 msvcrt.locking。
    超时后抛出 LockError。

    Args:
        lock_path: 锁文件路径
        timeout: 获取锁的超时秒数
        poll_interval: 轮询间隔秒数

    Yields:
        文件描述符

    Raises:
        LockError: 超时未获取到锁
    """
    lock_path = Path(lock_path)
    lock_path.parent.mkdir(parents=True, exist_ok=True)

    fd = os.open(str(lock_path), os.O_CREAT | os.O_RDWR, 0o600)
    if os.name == "nt" and os.path.getsize(lock_path) == 0:
        os.write(fd, b"0")
        os.lseek(fd, 0, os.SEEK_SET)
    deadline = time.monotonic() + timeout

    try:
        while True:
            try:
                if os.name == "nt":
                    os.lseek(fd, 0, os.SEEK_SET)
                    msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
                else:
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except (IOError, OSError):
                if time.monotonic() >= deadline:
                    raise LockError(
                        f"获取文件锁超时 ({timeout}s): {lock_path}"
                    )
                time.sleep(poll_interval)

        try:
            yield fd
        finally:
            if os.name == "nt":
                os.lseek(fd, 0, os.SEEK_SET)
                msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(fd, fcntl.LOCK_UN)
    finally:
        os.close(fd)

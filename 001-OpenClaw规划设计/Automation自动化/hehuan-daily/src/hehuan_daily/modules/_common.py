"""模块共用工具。"""

from __future__ import annotations

from typing import Type

from .base import Module
from .registry import ModuleId, register


def make_module(module_id: ModuleId) -> Type[Module]:
    """创建已注册模块类的工厂函数。"""

    class _Module(Module):
        @property
        def module_id(self) -> str:
            return module_id.value

    _Module.__name__ = f"{module_id.value.title().replace('_', '')}Module"
    _Module.__qualname__ = _Module.__name__
    return register(module_id)(_Module)

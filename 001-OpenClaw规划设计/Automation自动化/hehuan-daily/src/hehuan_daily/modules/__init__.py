"""模块流水线：7 模块 resolve → collect → render。"""

from .base import Module, ModuleContext, ModuleResult, ModuleError
from .registry import (
    ModuleId,
    get_module,
    get_all_modules,
    DEFAULT_MODULE_ORDER,
    MIN_MODULES,
    MAX_MODULES,
    validate_module_order,
)

# 触发模块注册
from . import (  # noqa: F401
    folk_calendar,
    weather,
    aqi,
    attire,
    tasks,
    disciples,
    schedule,
)

__all__ = [
    "Module",
    "ModuleContext",
    "ModuleResult",
    "ModuleError",
    "ModuleId",
    "get_module",
    "get_all_modules",
    "DEFAULT_MODULE_ORDER",
    "MIN_MODULES",
    "MAX_MODULES",
    "validate_module_order",
]

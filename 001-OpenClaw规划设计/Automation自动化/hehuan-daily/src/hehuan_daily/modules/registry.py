"""模块注册表：ModuleId enum + 模块注册 + 默认顺序。"""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional, Type

from .base import Module


class ModuleId(str, Enum):
    """模块标识枚举。"""

    FOLK_CALENDAR = "folk_calendar"
    WEATHER = "weather"
    AQI = "aqi"
    ATTIRE = "attire"
    TASKS = "tasks"
    DISCIPLES = "disciples"
    SCHEDULE = "schedule"


# 默认模块顺序（7 模块，固定）
DEFAULT_MODULE_ORDER: List[ModuleId] = [
    ModuleId.WEATHER,
    ModuleId.AQI,
    ModuleId.ATTIRE,
    ModuleId.TASKS,
    ModuleId.DISCIPLES,
    ModuleId.SCHEDULE,
    ModuleId.FOLK_CALENDAR,
]

# 模块数量约束
MIN_MODULES = 7
MAX_MODULES = 7

# 内部注册表
_MODULE_REGISTRY: Dict[ModuleId, Type[Module]] = {}


def register(module_id: ModuleId):
    """模块注册装饰器。"""

    def decorator(cls: Type[Module]):
        cls._module_id_static = module_id  # 设置静态 module_id
        _MODULE_REGISTRY[module_id] = cls
        return cls

    return decorator


def get_module(module_id: ModuleId) -> Optional[Module]:
    """按 ModuleId 获取模块实例。"""
    cls = _MODULE_REGISTRY.get(module_id)
    if cls is None:
        return None
    return cls()


def get_all_modules() -> Dict[ModuleId, Type[Module]]:
    """获取所有已注册模块。"""
    return dict(_MODULE_REGISTRY)


def validate_module_order(order: List[ModuleId]) -> List[str]:
    """校验模块顺序。返回错误列表（空表示通过）。"""
    errors = []
    if len(order) < MIN_MODULES:
        errors.append(f"模块数量不足: 最少 {MIN_MODULES}, 实际 {len(order)}")
    if len(order) > MAX_MODULES:
        errors.append(f"模块数量超限: 最多 {MAX_MODULES}, 实际 {len(order)}")
    if len(set(order)) != len(order):
        errors.append("模块顺序中存在重复模块")
    for mid in order:
        if mid not in _MODULE_REGISTRY:
            errors.append(f"未注册的模块: {mid}")
    return errors

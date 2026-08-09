"""模块基类：定义 resolve → collect → render 流水线接口。"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Optional

from ..config import Config, default_config
from ..models import (
    AQIData,
    DataSourceResult,
    LunarData,
    PersonalTemplate,
    TravelOverride,
    WeatherData,
)


@dataclass
class ModuleContext:
    """模块运行时上下文。"""

    target_date: date
    config: Config = field(default_factory=lambda: default_config)

    # 数据源结果（由 pipeline 统一注入）
    weather_result: Optional[DataSourceResult] = None
    aqi_result: Optional[DataSourceResult] = None
    lunar_result: Optional[DataSourceResult] = None
    template: Optional[PersonalTemplate] = None
    active_override: Optional[TravelOverride] = None

    # 运行时元数据
    fetched_at: datetime = field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = field(default_factory=dict)

    # ── 便捷访问 ─────────────────────────────────────────────
    @property
    def weather(self) -> Optional[WeatherData]:
        return self.weather_result.data if self.weather_result else None

    @property
    def aqi(self) -> Optional[AQIData]:
        return self.aqi_result.data if self.aqi_result else None

    @property
    def lunar(self) -> Optional[LunarData]:
        return self.lunar_result.data if self.lunar_result else None

    @property
    def effective_latitude(self) -> float:
        if self.active_override:
            return self.active_override.latitude
        if self.template and self.template.latitude is not None:
            return self.template.latitude
        return self.config.default_latitude

    @property
    def effective_longitude(self) -> float:
        if self.active_override:
            return self.active_override.longitude
        if self.template and self.template.longitude is not None:
            return self.template.longitude
        return self.config.default_longitude


@dataclass
class ModuleResult:
    """模块渲染结果。"""

    module_id: str
    text: str  # 纯文本渲染结果
    is_degraded: bool = False
    is_placeholder: bool = False
    notes: list[str] = field(default_factory=list)


def degraded_result(module_id: str, reason: str) -> ModuleResult:
    """为不可用模块生成仍占据固定槽位的明确降级段。"""
    headings = {
        "folk_calendar": "╭─ 🧧 今日小签",
        "weather": "╭─ ☀️ 天候司 · 今日云笺",
        "aqi": "╭─ 🪷 清气监 · 空气质量",
        "attire": "╭─ 👘 衣行令 · 穿衣出行",
        "tasks": "╭─ 🏯 宗门脉象 · 今日运行",
        "disciples": "╭─ ⚪ 门人名录 · 状态待核",
        "schedule": "╭─ 📌 今日玉牒 · 今日要事",
    }
    friendly_reason = {
        "tasks": "│ 今日尚无已核实的任务回报",
        "disciples": "│ 门人状态尚在核对，不作猜测",
        "schedule": "│ 今日暂无已确认要事",
    }.get(module_id, "│ 此项资料暂未齐备，已如实留空")
    closing = {
        "weather": "╰─ 天候资料未齐，出门前请再看一眼实时天气",
        "aqi": "╰─ 清气资料未齐，今日以身体感受为先",
        "attire": "╰─ 衣行建议未齐，以舒适稳妥为先",
        "tasks": "╰─ 未核实内容不作猜测",
        "disciples": "╰─ 核清后再向少主回禀",
        "schedule": "╰─ 暂无安排，留些从容给自己",
        "folk_calendar": "╰─ 小签资料未齐，今日仍可从容行事",
    }.get(module_id, "╰─ 此项暂缺")
    return ModuleResult(
        module_id=module_id,
        text=f"{headings.get(module_id, '╭─ 今日补记')}\n│\n{friendly_reason}\n│\n{closing}",
        is_degraded=True,
        is_placeholder=True,
        notes=[reason],
    )


class ModuleError(Exception):
    """模块执行异常。"""


class Module(ABC):
    """模块基类：每个模块实现 resolve → collect → render。"""

    @property
    @abstractmethod
    def module_id(self) -> str:
        """模块标识。"""

    @abstractmethod
    def resolve(self, ctx: ModuleContext) -> bool:
        """判断模块是否应当执行。返回 True 表示需要渲染。"""

    @abstractmethod
    def collect(self, ctx: ModuleContext) -> Any:
        """采集数据（返回原始数据对象）。"""

    @abstractmethod
    def render(self, data: Any) -> str:
        """将采集的数据渲染为纯文本。"""

    def execute(self, ctx: ModuleContext) -> Optional[ModuleResult]:
        """执行完整流水线：resolve → collect → render。"""
        if not self.resolve(ctx):
            return degraded_result(self.module_id, "  暂无可用数据（已降级）")
        try:
            data = self.collect(ctx)
            text = self.render(data)
            return ModuleResult(
                module_id=self.module_id,
                text=text,
            )
        except Exception as e:
            raise ModuleError(f"模块 {self.module_id} 执行失败: {e}") from e

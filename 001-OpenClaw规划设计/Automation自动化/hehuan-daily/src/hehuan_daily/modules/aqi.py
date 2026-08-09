"""空气质量模块。"""

from __future__ import annotations

from typing import Any, Optional

from .base import Module, ModuleContext
from .registry import ModuleId, register


@register(ModuleId.AQI)
class AQIModule(Module):
    """空气质量模块。"""

    @property
    def module_id(self) -> str:
        return ModuleId.AQI.value

    def resolve(self, ctx: ModuleContext) -> bool:
        return ctx.aqi is not None

    def collect(self, ctx: ModuleContext) -> Any:
        return ctx.aqi

    def render(self, data: Any) -> str:
        lines = ["╭─ 🪷 清气监 · 空气质量", "│"]
        if data.aqi is not None:
            scale = "US AQI" if data.is_model_estimate else "AQI"
            icon = "🟢" if data.aqi <= 50 else "🟡" if data.aqi <= 100 else "🟠" if data.aqi <= 150 else "🔴"
            lines.append(f"│ {icon} {scale} {data.aqi} · {data.level.value}")
        else:
            lines.append("│ ⚪ AQI 暂无可靠数值")
        if data.pm25 is not None:
            lines.append(f"│ 🌫 PM2.5：{data.pm25:.1f} μg/m³")
        if data.pm10 is not None:
            lines.append(f"│ 🍃 PM10：{data.pm10:.1f} μg/m³")
        if data.trend:
            lines.append(f"│ 📈 24 小时趋势：{data.trend}")
        lines.extend(["│", "│ " + _general_advice(data.aqi), "│ " + _sensitive_advice(data.aqi)])
        if data.is_model_estimate:
            lines.extend(["│", "│ 此处采用空气质量模型估算，并非监测站实测"])
        lines.extend(["│", "╰─ " + _aqi_closing(data.aqi)])
        return "\n".join(lines)


def _general_advice(aqi: int | None) -> str:
    if aqi is None:
        return "数值暂缺时，按平日强度活动即可"
    return "普通人群可正常活动" if aqi <= 100 else "普通人群宜适当减少长时间剧烈运动"


def _sensitive_advice(aqi: int | None) -> str:
    if aqi is None:
        return "敏感人群若感不适，及时转入室内休息"
    return "敏感人群可留意自身感受" if aqi <= 50 else "敏感人群避免长时间剧烈运动"


def _aqi_closing(aqi: int | None) -> str:
    if aqi is None:
        return "清气数值未齐，今日以身体感受为先"
    if aqi <= 100:
        return "清气尚可，照常活动即可"
    return "清气偏浊，户外活动宜稍作收敛"

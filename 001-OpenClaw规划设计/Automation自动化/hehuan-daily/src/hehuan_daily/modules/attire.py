"""穿衣建议模块：基于天气数据生成穿衣建议。"""

from __future__ import annotations

from typing import Any, Optional

from .base import Module, ModuleContext
from .registry import ModuleId, register


@register(ModuleId.ATTIRE)
class AttireModule(Module):
    """穿衣建议模块。"""

    @property
    def module_id(self) -> str:
        return ModuleId.ATTIRE.value

    def resolve(self, ctx: ModuleContext) -> bool:
        """有天气数据时启用。"""
        return ctx.weather is not None

    def collect(self, ctx: ModuleContext) -> Any:
        return ctx.weather

    def render(self, data: Any) -> str:
        lines = ["╭─ 👘 衣行令 · 穿衣出行", "│"]
        temp = data.temperature_c
        recommendation = "按体感选择舒适衣物"
        if temp is not None:
            if temp <= 0:
                recommendation = "羽绒服、保暖内衣与围巾手套"
            elif temp <= 10:
                recommendation = "厚外套、毛衣与长裤"
            elif temp <= 18:
                recommendation = "长袖配夹克或薄外套"
            elif temp <= 25:
                recommendation = "长袖上衣，薄外套随身备用"
            elif temp <= 32:
                recommendation = "轻薄短袖与透气下装"
            else:
                recommendation = "轻薄短袖与透气下装"
        lines.append(f"│ 🪶 推荐：{recommendation}")
        protection = "按需补水，留意体感变化"
        if data.uv_index is not None and data.uv_index >= 6:
            protection = "遮阳、防晒、及时补水"
        lines.append(f"│ 🧴 防护：{protection}")
        rain = data.daily_max_precip_probability or 0
        if rain >= 30 or (data.daily_precip_sum or 0) > 0 or (data.precipitation_mm or 0) > 0:
            lines.append("│ ☂️ 随行：一柄晴雨两用伞")
        else:
            lines.append("│ 🎒 随行：轻装即可，水杯莫忘")
        if data.wind_speed_kmh is not None and data.wind_speed_kmh >= 30:
            lines.append("│ 🌬 提醒：风力较大，行路留意侧风")
        elif temp is not None and temp >= 32:
            lines.append("│ 🚗 提醒：车内勿久留人员或怕热物品")
        lines.extend(["│", "╰─ " + ("上午宜行，午后宜缓" if temp is not None and temp >= 32 else "衣行从简，以舒适稳妥为先")])
        return "\n".join(lines)

"""日程模块：从个人模板读取今日日程。"""

from __future__ import annotations

from typing import Any, Optional

from .base import Module, ModuleContext
from .registry import ModuleId, register


@register(ModuleId.SCHEDULE)
class ScheduleModule(Module):
    """日程模块。"""

    @property
    def module_id(self) -> str:
        return ModuleId.SCHEDULE.value

    def resolve(self, ctx: ModuleContext) -> bool:
        """模板有日程数据时启用。"""
        if ctx.template is None:
            return False
        custom = ctx.template.custom_sections
        schedule = custom.get("schedule", [])
        return bool(schedule)

    def collect(self, ctx: ModuleContext) -> Any:
        return ctx.template.custom_sections.get("schedule", [])

    def render(self, data: Any) -> str:
        heading = "╭─ 📌 今日玉牒 · 要事三则" if len(data) == 3 else "╭─ 📌 今日玉牒 · 今日要事"
        lines = [heading, "│"]
        numerals = ["❶", "❷", "❸", "❹", "❺"]
        for index, item in enumerate(data[:5]):
            if isinstance(item, dict):
                start_at = item.get("startAt", item.get("time", ""))
                end_at = item.get("endAt", "")
                title = item.get("title", str(item))
                location = item.get("location", "")
                status = item.get("status", "confirmed")
                # 时间格式化
                if start_at and end_at:
                    time_str = f"{start_at}–{end_at}"
                elif start_at:
                    time_str = start_at
                else:
                    time_str = "全天"
                # 暂定标记
                if status == "tentative":
                    time_str += " 暂定"
                # 地点
                loc_str = f"｜{location}" if location else ""
                lines.append(f"│ {numerals[index]} {time_str}　{title}{loc_str}")
            else:
                lines.append(f"│ {numerals[index]} {item}")
        lines.extend(["│", "╰─ 先急后缓，留有余地"])
        return "\n".join(lines)

"""黄历模块：农历、干支、宜忌、冲煞、节气。"""

from __future__ import annotations

from typing import Any, Optional

from .base import Module, ModuleContext
from .registry import ModuleId, register


@register(ModuleId.FOLK_CALENDAR)
class FolkCalendarModule(Module):
    """黄历 / 八字模块。"""

    @property
    def module_id(self) -> str:
        return ModuleId.FOLK_CALENDAR.value

    def resolve(self, ctx: ModuleContext) -> bool:
        """有农历数据时启用。"""
        return ctx.lunar is not None

    def collect(self, ctx: ModuleContext) -> Any:
        return ctx.lunar

    def render(self, data: Any) -> str:
        """渲染黄历信息。"""
        lines = ["╭─ 🧧 今日小签", "│"]
        if data.yi:
            lines.append(f"│ ✨ 宜：{' · '.join(data.yi[:3])}")
        if data.ji:
            lines.append(f"│ ⚠️ 忌：{' · '.join(data.ji[:3])}")
        verse_a, verse_b = _daily_verse(data.day_ganzhi or "")
        lines.extend(["│", f"│ 「{verse_a}", f"│ {verse_b}」", "│", "╰─ 签意：中吉"])
        return "\n".join(lines)


def _daily_verse(day_ganzhi: str) -> tuple[str, str]:
    verses = (
        ("心有定处，纷扰自退；", "行有次序，诸事可成。"),
        ("步稳不争一时快；", "心明自有万事安。"),
        ("先理眼前清楚事；", "再迎远处好风来。"),
        ("守住从容方寸地；", "自能次第见花开。"),
    )
    return verses[sum(ord(ch) for ch in day_ganzhi) % len(verses)]

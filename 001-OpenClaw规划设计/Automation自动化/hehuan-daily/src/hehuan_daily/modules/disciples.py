"""弟子信息模块：从个人模板读取弟子相关信息。"""

from __future__ import annotations

from typing import Any, Optional

from .base import Module, ModuleContext
from .registry import ModuleId, register


@register(ModuleId.DISCIPLES)
class DisciplesModule(Module):
    """弟子信息模块。"""

    @property
    def module_id(self) -> str:
        return ModuleId.DISCIPLES.value

    def resolve(self, ctx: ModuleContext) -> bool:
        """模板有弟子数据时启用。"""
        if ctx.template is None:
            return False
        custom = ctx.template.custom_sections
        disciples = custom.get("disciples", [])
        return bool(disciples)

    def collect(self, ctx: ModuleContext) -> Any:
        return ctx.template.custom_sections.get("disciples", [])

    def render(self, data: Any) -> str:
        online_states = {"available", "busy"}
        online = sum(1 for item in data if isinstance(item, dict) and item.get("state") in online_states)
        lines = [f"╭─ 🟢 门人名录 · 在线 {online} / {len(data)}", "│"]
        for disciple in data[:8]:
            if isinstance(disciple, dict):
                name = disciple.get("displayName", disciple.get("name", str(disciple)))
                state = disciple.get("state", "")
                focus = disciple.get("focus", "")
                state_desc = {
                    "available": "在线",
                    "busy": "忙碌",
                    "away": "离线",
                    "needs_attention": "需留意",
                }
                desc = state_desc.get(state, "")
                if focus:
                    lines.append(f"│ 🌸 {name}｜{desc} · {focus}")
                else:
                    lines.append(f"│ 🌸 {name}｜{desc}") if desc else lines.append(f"│ 🌸 {name}")
            else:
                lines.append(f"│ 🌸 {disciple}")
        lines.extend(["│", "╰─ 门人状态只据已核实记录回禀"])
        return "\n".join(lines)

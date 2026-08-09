"""待办事项模块：从个人模板读取今日待办。"""

from __future__ import annotations

from typing import Any, Optional

from .base import Module, ModuleContext
from .registry import ModuleId, register


@register(ModuleId.TASKS)
class TasksModule(Module):
    """待办事项模块。"""

    @property
    def module_id(self) -> str:
        return ModuleId.TASKS.value

    def resolve(self, ctx: ModuleContext) -> bool:
        """模板有待办数据时启用。"""
        if ctx.template is None:
            return False
        custom = ctx.template.custom_sections
        tasks = custom.get("tasks", [])
        return bool(tasks)

    def collect(self, ctx: ModuleContext) -> Any:
        return ctx.template.custom_sections.get("tasks", [])

    def render(self, data: Any) -> str:
        lines = ["╭─ 🏯 宗门脉象 · 今日运行", "│"]
        groups = {"done": [], "failed": [], "doing": [], "todo": [], "blocked": []}
        for task in data:
            if isinstance(task, dict):
                title = task.get("title", str(task))
                status = task.get("status", "todo")
                note = task.get("note", "")
                entry = f"{title}（{note}）" if note else str(title)
                groups.setdefault(status, groups["todo"]).append(entry)
            else:
                groups["todo"].append(str(task))
        sections = [
            ("✅", "已完成任务", groups["done"]),
            ("❌", "失败或受阻任务", groups["failed"] + groups["blocked"]),
            ("⚙️", "进行中任务", groups["doing"]),
            ("📌", "待办任务", groups["todo"]),
        ]
        for icon, label, items in sections:
            if not items:
                continue
            lines.append(f"│ {icon} {label} · {len(items)} 项")
            for item in items[:3]:
                lines.append(f"│ · {item}")
            if len(items) > 3:
                lines.append(f"│ · 其余 {len(items) - 3} 项不在晨报展开")
            lines.append("│")
        lines.append("╰─ 已核实的宗门事务如上，未核实内容不作猜测")
        return "\n".join(lines)

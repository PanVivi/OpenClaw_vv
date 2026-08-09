"""晨间玉简固定版式常量。"""

from __future__ import annotations

# ── 2026-08-04 11:54 已确认定稿 ───────────────────────────────
TOP_ORNAMENT: str = "༺═────────────────═༻"
TITLE_LINE: str = "　　　　　 🌙 合欢宗 · 晨间玉简 🌙"
TITLE_PREFIX: str = TOP_ORNAMENT
SALUTATION: str = "📜 少主亲启"
CLOSING_WISH: str = "　💮 愿少主今日诸事从容，所行皆有回响"

# ── 生产预算 ──────────────────────────────────────────────────
PRODUCTION_BUDGET: int = 3800  # 安全预算
HARD_LIMIT: int = 4096  # Telegram Bot API 硬上限

# ── 排版不变量 ────────────────────────────────────────────────
HEADER_DISPLAY_CELLS: int = 16  # 定稿纹饰视觉宽度标记
SEPARATOR_DISPLAY_CELLS: int = 9  # 分隔线宽度（每段横线）
# 9 格分隔线：✦ ───────── ❖ ───────── ✦
SEPARATOR: str = "✦ ───────── ❖ ───────── ✦"

# 历史失败样本只用于回归测试，绝不能再作为生产标题。
LEGACY_FLAT_TITLE: str = "🌈👠🫦👅合欢宗 · 晨间玉简🧛💍💄🦄"

DECORATION_POOL: list[str] = ["🌙", "📜", "☀️", "🪷", "👘", "🏯", "📌", "🧧", "💮"]
MOON_POOL: list[str] = ["🌙"]

# ── 自定义 Emoji 静态 allowlist ──────────────────────────────
# Owner 首选：👅 和 🧛
# 仅允许 Markdown 链接格式：[emoji](tg://emoji?id=ID)
# 两个固定 token，已嵌入 TITLE_PREFIX，不再做运行时替换
CUSTOM_EMOJI: dict[str, str] = {
    "👅": "5337104457123504497",
    "🧛": "5330437392274827570",
}

# Custom emoji 仅允许 Markdown 链接格式（owner 实机验证唯一成功格式）
CUSTOM_EMOJI_FORMAT: str = "markdown_link"

# ── HTML 白名单 ───────────────────────────────────────────────
ALLOWED_HTML_TAGS: frozenset[str] = frozenset({"b", "i", "code", "pre"})

# ── 模块约束（定义在 modules/registry.py，此处保留注释说明）──────
# MIN_MODULES = 7, MAX_MODULES = 7 — see modules/registry.py

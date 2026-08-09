"""排版引擎：排序、缩进、分隔线、HTML 转义、自定义 Emoji、长度压缩。"""

from __future__ import annotations

import html
import math
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any, Sequence

from .constants import (
    ALLOWED_HTML_TAGS,
    CUSTOM_EMOJI,
    CUSTOM_EMOJI_FORMAT,
    HARD_LIMIT,
    CLOSING_WISH,
    PRODUCTION_BUDGET,
    SALUTATION,
    SEPARATOR,
    TITLE_LINE,
    TITLE_PREFIX,
    TOP_ORNAMENT,
)

# TITLE_PREFIX 已是最终字面值（含 Markdown custom emoji 链接），
# 不再做运行时替换。apply_custom_emoji 保留供测试/外部使用。
from .modules.base import ModuleResult, degraded_result
from .models import LunarData, WeatherData


# ── 数据类 ────────────────────────────────────────────────────
@dataclass
class ComposedBrief:
    """排版后的简报。"""

    text: str
    char_count: int
    was_compressed: bool
    dropped_modules: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class PresentationContext:
    """仅供定稿排版使用的事实上下文。"""

    target_date: date
    lunar: LunarData | None = None
    weather: WeatherData | None = None
    preferences: dict[str, dict[str, Any]] = field(default_factory=dict)
    header_notes: list[str] = field(default_factory=list)


# ── HTML 转义 ─────────────────────────────────────────────────
# 白名单标签保留，其余动态数据中的特殊字符全部转义
_ALLOWED_TAG_RE = re.compile(
    r"<(/?)({tags})\b[^>]*>".format(tags="|".join(ALLOWED_HTML_TAGS))
)
# 属性值中的引号也转义
_ATTR_QUOTE_RE = re.compile(r'=([\'"])(.*?)\1')


def escape_html(text: str) -> str:
    """对动态文本做 HTML 转义：& → &amp;，< → &lt;，> → &gt;。

    白名单标签（<b>/<i>/<code>/<pre>）保留不动，
    但标签内的动态内容由调用方在拼接前转义。
    """
    return html.escape(text, quote=False)


def sanitize_dynamic(text: str) -> str:
    """对纯动态文本做严格 HTML 转义，包括引号。"""
    return html.escape(text, quote=True)


# ── 自定义 Emoji ──────────────────────────────────────────────
def _build_custom_emoji_tokens() -> dict[str, str]:
    """构建 custom emoji 替换映射。

    仅支持 Markdown 链接格式：[emoji](tg://emoji?id=ID)
    """
    return {
        ch: f"[{ch}](tg://emoji?id={emoji_id})"
        for ch, emoji_id in CUSTOM_EMOJI.items()
    }


def apply_custom_emoji(text: str) -> str:
    """将文本中的 Unicode custom emoji 替换为 Markdown 链接。

    仅替换 CUSTOM_EMOJI allowlist 中的字符。
    若文本已包含 Markdown 链接（tg://emoji），直接返回避免重复替换。
    """
    if "tg://emoji" in text:
        return text
    tokens = _build_custom_emoji_tokens()
    for ch, replacement in tokens.items():
        text = text.replace(ch, replacement)
    return text


# ── 长度压缩 ──────────────────────────────────────────────────
def _compress_lines(lines: list[str], max_chars: int) -> tuple[list[str], bool]:
    """压缩行列表到目标字符数以内。

    策略：每模块保留前三项并给"另有 N 项"。
    返回 (压缩后行列表, 是否做了压缩)。
    """
    # 计算当前总长
    current = sum(len(line) + 1 for line in lines)  # +1 for newline
    if current <= max_chars:
        return lines, False

    # 按模块分组压缩
    compressed: list[str] = []
    i = 0
    was_compressed = False
    while i < len(lines):
        line = lines[i]
        # 检测模块标题（单行、无缩进）
        if line and not line.startswith(" ") and not line.startswith("─"):
            module_name = line
            compressed.append(line)
            i += 1
            # 收集该模块的内容行
            content_lines: list[str] = []
            while i < len(lines) and lines[i].startswith(" "):
                content_lines.append(lines[i])
                i += 1
            # 如果内容超过 3 行，压缩
            if len(content_lines) > 3:
                compressed.extend(content_lines[:3])
                compressed.append(f"  另有 {len(content_lines) - 3} 项")
                was_compressed = True
            else:
                compressed.extend(content_lines)
        else:
            compressed.append(line)
            i += 1

    return compressed, was_compressed


# ── 主排版函数 ────────────────────────────────────────────────
def compose(
    module_results: Sequence[ModuleResult],
    title_prefix: str = TITLE_PREFIX,
    budget: int = PRODUCTION_BUDGET,
    hard_limit: int = HARD_LIMIT,
    presentation: PresentationContext | None = None,
) -> ComposedBrief:
    """按 2026-08-04 11:54 已确认完整版排出唯一正式消息。"""
    warnings: list[str] = []
    dropped: list[str] = []

    # 1. 保留固定模块槽位；空文本也必须有明确降级段
    valid_results: list[ModuleResult] = []
    for r in module_results:
        if r.text.strip():
            valid_results.append(r)
        else:
            reason = "  输出为空（已降级）"
            valid_results.append(degraded_result(r.module_id, reason))
            warnings.append(f"模块 {r.module_id} 输出为空，已降级")

    if presentation is None:
        presentation = PresentationContext(target_date=date.today())

    header_lines = _header_lines(presentation, title_prefix)
    body_lines: list[str] = []
    for idx, result in enumerate(valid_results):
        if idx > 0:
            body_lines.extend(["", SEPARATOR, ""])
        block = result.text.strip()
        if result.module_id == "weather":
            block = _add_moon_line(block, presentation.target_date)
        body_lines.extend(_escape_line(line) for line in block.splitlines())

    final_lines = [
        *header_lines,
        "",
        SEPARATOR,
        "",
        *body_lines,
        "",
        *_closing_lines(presentation),
    ]
    text = "\n".join(final_lines)
    char_count = len(text)
    was_compressed = False

    if char_count > budget:
        compact_results = [_compact_block(result) for result in valid_results]
        body_lines = []
        for idx, result in enumerate(compact_results):
            if idx > 0:
                body_lines.extend(["", SEPARATOR, ""])
            block = result.text.strip()
            if result.module_id == "weather":
                block = _add_moon_line(block, presentation.target_date)
            body_lines.extend(_escape_line(line) for line in block.splitlines())
        final_lines = [
            *header_lines, "", SEPARATOR, "", *body_lines, "",
            *_closing_lines(presentation),
        ]
        text = "\n".join(final_lines)
        char_count = len(text)
        was_compressed = True
        warnings.append("已执行长度压缩")

    if char_count > hard_limit:
        # 压缩后仍超限 → 零发送
        warnings.append(
            f"压缩后仍超硬极限 ({char_count} > {hard_limit})，本次不发送"
        )

    return ComposedBrief(
        text=text,
        char_count=char_count,
        was_compressed=was_compressed,
        dropped_modules=dropped,
        warnings=warnings,
    )


def _header_lines(ctx: PresentationContext, title_prefix: str) -> list[str]:
    top = title_prefix or TOP_ORNAMENT
    solar = ctx.target_date
    weekday = "一二三四五六日"[solar.weekday()]
    lunar_text = "农历资料暂缺"
    if ctx.lunar is not None:
        month = ctx.lunar.lunar_month_name or ""
        day_name = ctx.lunar.lunar_day_name or ""
        leap = "闰" if ctx.lunar.is_leap_month else ""
        year = f"{ctx.lunar.year_ganzhi}年" if ctx.lunar.year_ganzhi else ""
        lunar_text = f"农历{year}{leap}{month}{day_name}"
    morning_a, morning_b = _morning_words(ctx.weather)
    header_preferences = ctx.preferences.get("header", {})
    salutation_value = header_preferences.get("salutation")
    salutation = (
        f"📜 {str(salutation_value).strip()}"
        if isinstance(salutation_value, str) and salutation_value.strip()
        else SALUTATION
    )
    lines = [
        top,
        TITLE_LINE,
        TOP_ORNAMENT,
        "",
        _escape_line(salutation),
        "",
        f"📅 {solar.year}年{solar.month}月{solar.day}日 星期{weekday} · {lunar_text}",
        "",
        morning_a,
        morning_b,
    ]
    for note in ctx.header_notes[:2]:
        if isinstance(note, str) and note.strip():
            lines.append(_escape_line(f"📝 {note.strip()}"))
    return lines


def _closing_lines(ctx: PresentationContext) -> list[str]:
    lines = [TOP_ORNAMENT, CLOSING_WISH]
    temporary = ctx.preferences.get("header", {}).get("temporary_wish")
    if isinstance(temporary, str) and temporary.strip():
        lines.append(_escape_line(f"　💮 {temporary.strip()}"))
    lines.append(TOP_ORNAMENT)
    return lines


def _morning_words(weather: WeatherData | None) -> tuple[str, str]:
    if weather is None:
        return "晨光初绽，万事待启。", "天候资料尚在核对；今日从容安排，先做要紧之事。"
    max_temp = weather.daily_max_temp if weather.daily_max_temp is not None else weather.temperature_c
    rain = weather.daily_max_precip_probability or 0
    if max_temp is not None and max_temp >= 35 and rain >= 30:
        return "晨光初绽，万事待启。", "今日炎热，午后或有阵雨；要事宜早办，闲情可稍留。"
    if max_temp is not None and max_temp >= 35:
        return "晨光初绽，万事待启。", "今日暑热明显；要事宜早办，午后记得放缓脚步。"
    if rain >= 30 or (weather.daily_precip_sum or 0) > 0:
        return "晨光初绽，万事待启。", "今日有雨意；出门把伞带好，行程之间留些余地。"
    return "晨光初绽，万事待启。", "今日天候较稳；循序安排，忙处不乱，闲处从容。"


def _add_moon_line(block: str, target_date: date) -> str:
    lines = block.splitlines()
    if any("月面照明" in line for line in lines):
        return block
    phase, illumination = _moon_phase(target_date)
    insert_at = max(len(lines) - 1, 0)
    moon_lines = [f"│ {_moon_icon(phase)} {phase} · 月面照明约 {illumination}%", "│"]
    return "\n".join(lines[:insert_at] + moon_lines + lines[insert_at:])


def _moon_phase(target_date: date) -> tuple[str, int]:
    reference = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
    moment = datetime(target_date.year, target_date.month, target_date.day, 12, tzinfo=timezone.utc)
    cycle = 29.53058867
    age = ((moment - reference).total_seconds() / 86400.0) % cycle
    illumination = round((1 - math.cos(2 * math.pi * age / cycle)) * 50)
    if age < 1.85 or age >= 27.68:
        name = "新月"
    elif age < 5.54:
        name = "娥眉月"
    elif age < 9.23:
        name = "上弦月"
    elif age < 12.92:
        name = "盈凸月"
    elif age < 16.61:
        name = "满月"
    elif age < 21.50:
        name = "亏凸月"
    elif age < 23.99:
        name = "下弦月"
    else:
        name = "残月"
    return name, illumination


def _moon_icon(phase: str) -> str:
    return {
        "新月": "🌑", "娥眉月": "🌒", "上弦月": "🌓", "盈凸月": "🌔",
        "满月": "🌕", "亏凸月": "🌖", "下弦月": "🌗", "残月": "🌘",
    }[phase]


def _compact_block(result: ModuleResult) -> ModuleResult:
    lines = result.text.splitlines()
    if len(lines) <= 10:
        return result
    omitted = len(lines) - 8
    compact = [*lines[:6], f"│ · 另有 {omitted} 行未在晨报展开", *lines[-2:]]
    return ModuleResult(
        module_id=result.module_id,
        text="\n".join(compact),
        is_degraded=result.is_degraded,
        is_placeholder=result.is_placeholder,
        notes=list(result.notes),
    )


def _escape_line(line: str) -> str:
    """对单行做 HTML 转义，保留白名单标签。

    策略：先用占位符保护白名单标签，转义后再还原。
    """
    if not line:
        return line

    # 保护白名单标签
    placeholders: list[str] = []

    def _protect(match: re.Match[str]) -> str:
        placeholders.append(match.group(0))
        return f"\x00{len(placeholders) - 1}\x00"

    protected = _ALLOWED_TAG_RE.sub(_protect, line)

    # 转义剩余内容
    escaped = escape_html(protected)

    # 还原白名单标签
    for i, tag in enumerate(placeholders):
        escaped = escaped.replace(f"\x00{i}\x00", tag)

    return escaped

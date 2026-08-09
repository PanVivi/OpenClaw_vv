"""FinalBrief 数据结构与 final-only 发送前闸门。"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .constants import ALLOWED_HTML_TAGS, HARD_LIMIT, TITLE_LINE, TOP_ORNAMENT
from .composer import apply_custom_emoji
from .schemas import validate_final_brief


# ── 幂等键格式 ────────────────────────────────────────────────
IDEMPOTENCY_PATTERN = re.compile(
    r"^morning-brief:-?[0-9]+:\d{4}-\d{2}-\d{2}:v\d+$"
)

# v2 marks the repaired ornate layout and owner-controlled input workflow.
# Keeping this separate from the helper default preserves compatibility for
# callers that deliberately construct historical v1 fixtures.
CURRENT_BRIEF_VERSION = 2

# 裸 & 检测：排除 &amp; &lt; &gt; &quot; &apos; &#123; 等实体
_BARE_AMP_RE = re.compile(r"&(?!(amp|lt|gt|quot|apos|#)\b)")


@dataclass(frozen=True)
class FinalBrief:
    """发送闸门接受的不可变消息。"""

    text: str
    account_id: str
    chat_id: str
    brief_date: str
    idempotency_key: str
    parse_mode: str = "HTML"
    kind: str = "final"

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "text": self.text,
            "parseMode": self.parse_mode,
            "accountId": self.account_id,
            "chatId": self.chat_id,
            "briefDate": self.brief_date,
            "idempotencyKey": self.idempotency_key,
        }


def build_idempotency_key(chat_id: str, brief_date: str, version: int = 1) -> str:
    """构建幂等键：morning-brief:<chat_id>:<brief_date>:v<N>。"""
    return f"morning-brief:{chat_id}:{brief_date}:v{version}"


def create_final_brief(
    text: str,
    account_id: str,
    chat_id: str,
    brief_date: str,
    version: int = 1,
) -> FinalBrief:
    """工厂函数：从排版结果创建 FinalBrief。

    自动构建幂等键。调用方只需提供 account_id、chat_id 和日期。
    """
    return FinalBrief(
        text=text,
        account_id=account_id,
        chat_id=chat_id,
        brief_date=brief_date,
        idempotency_key=build_idempotency_key(chat_id, brief_date, version),
    )


# ── Final-only 闸门 ───────────────────────────────────────────
class FinalGateError(Exception):
    """闸门拒绝异常。"""


def final_gate_check(
    brief: FinalBrief,
    expected_title: str,
) -> list[str]:
    """发送前最终检查清单。

    返回错误列表（空表示通过）。任何错误都应阻止发送。
    """
    errors: list[str] = []

    # 1. 基本 schema 校验
    errors.extend(validate_final_brief(brief.to_dict()))

    # 2. 文本非空
    if not brief.text.strip():
        errors.append("text 为空或仅含空白")

    # 3. 仅一份抬头。定稿纹饰会在正文首尾重复，不能把纹饰误当标题计数。
    lines = brief.text.split("\n")
    if TITLE_LINE in brief.text:
        title_count = brief.text.count(TITLE_LINE)
        if title_count != 1:
            errors.append(f"标题出现 {title_count} 次，应仅一份抬头")

    # 4. 标题字面值与 golden fixture 一致
    if expected_title and lines:
        # 如果标题已包含 tg://emoji 链接，直接比较（不应用替换）
        if "tg://emoji" in expected_title:
            expected_with_emoji = expected_title
        else:
            # 应用相同的自定义 emoji 替换后比较
            expected_with_emoji = apply_custom_emoji(expected_title)
        if lines[0] != expected_with_emoji:
            errors.append("标题字面值与 golden fixture 不一致")
        if expected_title == TOP_ORNAMENT:
            if len(lines) < 3 or lines[1] != TITLE_LINE or lines[2] != TOP_ORNAMENT:
                errors.append("定稿抬头纹饰或标题位置不一致")

    # 5. 硬极限检查
    if len(brief.text) > HARD_LIMIT:
        errors.append(f"文本长度 {len(brief.text)} 超过硬极限 {HARD_LIMIT}")

    # 6. 安全检查：裸 < 或 &（白名单标签除外）
    errors.extend(_check_unescaped_html(brief.text))

    # 7. 仅一条消息（无"草稿如下"等第二条用户消息标记）
    if "草稿如下" in brief.text or "发送成功" in brief.text:
        errors.append("正文包含内部标记（草稿/发送成功），不得发送")

    return errors


def _check_unescaped_html(text: str) -> list[str]:
    """检查文本中是否有未转义的 < 或 &（白名单标签和 Markdown custom emoji 链接除外）。"""
    errors: list[str] = []
    cleaned = text
    # 移除 Markdown custom emoji 链接：[emoji](tg://emoji?id=...)
    cleaned = re.sub(r"\[([^\]]+)\]\(tg://emoji\?id=\d+\)", "", cleaned)
    # 移除所有白名单标签
    for tag in ALLOWED_HTML_TAGS:
        cleaned = re.sub(rf"<{tag}\b[^>]*>", "", cleaned)
        cleaned = re.sub(rf"</{tag}>", "", cleaned)
    # 检查剩余的 < 和 &
    if "<" in cleaned:
        errors.append("存在未转义的 '<'（非白名单标签）")
    # 检查裸 &（不是 &amp; &lt; &gt; &quot; &apos; &#123; 等实体的一部分）
    if _BARE_AMP_RE.search(cleaned):
        errors.append("存在未转义的 '&'")
    return errors

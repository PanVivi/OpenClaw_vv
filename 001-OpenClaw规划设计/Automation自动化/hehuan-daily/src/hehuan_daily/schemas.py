"""个人模板与出行覆盖的 JSON Schema 定义与校验。

内置轻量级 JSON Schema 校验器（无需第三方依赖），
覆盖核心约束: required, type, pattern, enum, minimum/maximum,
format (date, date-time), additionalProperties。
"""

from __future__ import annotations

import json
import re

# ── 个人模板 Schema ────────────────────────────────────────────
PERSONAL_TEMPLATE_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://hehuan-daily.local/schemas/personal-template.json",
    "title": "PersonalTemplate",
    "description": "合欢宗晨间玉简个人模板",
    "type": "object",
    "required": ["template_id", "name"],
    "properties": {
        "template_id": {
            "type": "string",
            "pattern": "^[a-zA-Z0-9_-]{1,64}$",
            "description": "模板唯一标识",
        },
        "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128,
            "description": "模板显示名",
        },
        "created_at": {"type": "string", "format": "date-time"},
        "updated_at": {"type": "string", "format": "date-time"},
        # L1
        "greeting_style": {
            "type": ["string", "null"],
            "enum": ["formal", "casual", "poetic", "concise", None],
        },
        "language": {"type": "string", "pattern": "^[a-z]{2}-[A-Z]{2}$"},
        "timezone": {"type": "string"},
        # L2
        "location_name": {"type": ["string", "null"], "maxLength": 64},
        "latitude": {"type": ["number", "null"], "minimum": -90, "maximum": 90},
        "longitude": {"type": ["number", "null"], "minimum": -180, "maximum": 180},
        "birth_date": {"type": ["string", "null"], "pattern": "^\\d{4}-\\d{2}-\\d{2}$"},
        "birth_time": {"type": ["string", "null"], "pattern": "^\\d{2}:\\d{2}$"},
        # L3 (encrypted blobs stored as base64)
        "legal_name_encrypted": {"type": ["string", "null"]},
        "id_number_encrypted": {"type": ["string", "null"]},
        "phone_encrypted": {"type": ["string", "null"]},
        "notes_encrypted": {"type": ["string", "null"]},
        # Custom
        "custom_sections": {
            "type": "object",
            "additionalProperties": True,
        },
    },
    "additionalProperties": False,
}

# ── 出行覆盖 Schema ────────────────────────────────────────────
TRAVEL_OVERRIDE_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://hehuan-daily.local/schemas/travel-override.json",
    "title": "TravelOverride",
    "description": "临时出行覆盖",
    "type": "object",
    "required": [
        "override_id",
        "start_date",
        "end_date",
        "location_name",
        "latitude",
        "longitude",
        "expires_at",
    ],
    "properties": {
        "override_id": {
            "type": "string",
            "pattern": "^[a-zA-Z0-9_-]{1,64}$",
        },
        "start_date": {"type": "string", "format": "date"},
        "end_date": {"type": "string", "format": "date"},
        "location_name": {"type": "string", "minLength": 1, "maxLength": 64},
        "latitude": {"type": "number", "minimum": -90, "maximum": 90},
        "longitude": {"type": "number", "minimum": -180, "maximum": 180},
        "expires_at": {
            "type": "string",
            "format": "date-time",
            "description": "强制过期时间",
        },
        "created_at": {"type": "string", "format": "date-time"},
        "notes": {"type": ["string", "null"], "maxLength": 512},
    },
    "additionalProperties": False,
}


def _validate_against_schema(data: dict, schema: dict, path: str = "") -> list[str]:
    """递归校验数据是否符合 JSON Schema 子集。
    
    支持的约束: required, type, pattern, enum, minimum, maximum,
    format (date, date-time), properties, additionalProperties。
    """
    errors: list[str] = []
    if not isinstance(data, dict):
        return [f"{path or 'root'}: 期望对象，实际为 {type(data).__name__}"]

    # required
    for field in schema.get("required", []):
        if field not in data:
            errors.append(f"{path or 'root'}: 缺少必填字段: {field}")

    # properties
    properties = schema.get("properties", {})
    for key, value in data.items():
        child_path = f"{path}.{key}" if path else key
        if key in properties:
            prop_schema = properties[key]
            errors.extend(_validate_value(value, prop_schema, child_path))
        elif schema.get("additionalProperties", True) is False:
            errors.append(f"{child_path}: 不允许的额外字段")

    return errors


def _validate_value(value, schema: dict, path: str) -> list[str]:
    """校验单个值。"""
    errors: list[str] = []

    # enum
    if "enum" in schema:
        if value not in schema["enum"]:
            errors.append(f"{path}: 值不在允许枚举中: {schema['enum']}")
        return errors  # enum 跳过其他校验

    # const
    if "const" in schema:
        if value != schema["const"]:
            errors.append(f"{path}: 值必须为 {schema['const']!r}")
        return errors

    # type (支持数组形式如 ["string", "null"])
    if "type" in schema:
        expected = schema["type"]
        if isinstance(expected, list):
            # 多类型: 只要匹配其一即可
            type_ok = any(_check_single_type(value, t) for t in expected)
            if not type_ok:
                errors.append(f"{path}: 类型错误，期望 {expected}，实际 {type(value).__name__}")
                return errors
        elif not _check_single_type(value, expected):
            errors.append(f"{path}: 类型错误，期望 {expected}，实际 {type(value).__name__}")
            return errors

    # string constraints
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(f"{path}: 字符串长度不足，最少 {schema['minLength']}")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(f"{path}: 字符串长度超限，最多 {schema['maxLength']}")
        if "pattern" in schema:
            if not re.match(schema["pattern"], value):
                errors.append(f"{path}: 格式不匹配模式 {schema['pattern']}")
        if "format" in schema:
            fmt = schema["format"]
            if fmt == "date" and not _is_valid_date(value):
                errors.append(f"{path}: 日期格式错误，期望 YYYY-MM-DD")
            elif fmt == "date-time" and not _is_valid_datetime(value):
                errors.append(f"{path}: 日期时间格式错误")

    # number constraints
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path}: 值 {value} 小于最小值 {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path}: 值 {value} 大于最大值 {schema['maximum']}")

    # object nested validation
    if isinstance(value, dict) and "properties" in schema:
        errors.extend(_validate_against_schema(value, schema, path))

    return errors


def _check_single_type(value, expected: str) -> bool:
    """检查值是否匹配单个 JSON Schema 类型。"""
    mapping = {
        "string": (str,),
        "number": (int, float),
        "integer": (int,),
        "boolean": (bool,),
        "array": (list,),
        "object": (dict,),
        "null": (type(None),),
    }
    return isinstance(value, mapping.get(expected, ())) and not (
        expected in ("number", "integer") and isinstance(value, bool)
    )


def _is_valid_date(s: str) -> bool:
    """校验 YYYY-MM-DD 格式。"""
    from datetime import date as _date

    try:
        _date.fromisoformat(s)
        return True
    except (ValueError, TypeError):
        return False


def _is_valid_datetime(s: str) -> bool:
    """校验 ISO 8601 日期时间格式。"""
    from datetime import datetime as _dt

    try:
        _dt.fromisoformat(s)
        return True
    except (ValueError, TypeError):
        return False


def validate_template(data: dict) -> list[str]:
    """校验模板数据是否符合 PERSONAL_TEMPLATE_SCHEMA。返回错误列表（空表示通过）。"""
    return _validate_against_schema(data, PERSONAL_TEMPLATE_SCHEMA)


def validate_override(data: dict) -> list[str]:
    """校验覆盖数据是否符合 TRAVEL_OVERRIDE_SCHEMA。返回错误列表（空表示通过）。"""
    return _validate_against_schema(data, TRAVEL_OVERRIDE_SCHEMA)


def load_schema(name: str) -> dict:
    """按名称加载 schema。"""
    schemas = {
        "personal_template": PERSONAL_TEMPLATE_SCHEMA,
        "travel_override": TRAVEL_OVERRIDE_SCHEMA,
    }
    if name not in schemas:
        raise ValueError(f"未知 schema: {name}")
    return schemas[name]


# ── FinalBrief 发送闸门 ───────────────────────────────────────
FINAL_BRIEF_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://hehuan-daily.local/schemas/final-brief.json",
    "title": "FinalBrief",
    "description": "发送前闸门：只接受不可变 FinalBrief",
    "type": "object",
    "additionalProperties": False,
    "required": ["kind", "text", "parseMode", "accountId", "chatId", "briefDate", "idempotencyKey"],
    "properties": {
        "kind": {"const": "final"},
        "text": {"type": "string", "minLength": 1},
        "parseMode": {"const": "HTML"},
        "accountId": {"type": "string", "minLength": 1},
        "chatId": {"type": "string", "pattern": "^-?[0-9]+$"},
        "briefDate": {"type": "string", "format": "date"},
        "idempotencyKey": {
            "type": "string",
            "pattern": "^morning-brief:-?[0-9]+:[0-9]{4}-[0-9]{2}-[0-9]{2}:v[0-9]+$",
        },
    },
}


def validate_final_brief(data: dict) -> list[str]:
    """校验 FinalBrief。返回错误列表（空表示通过）。"""
    errors = []
    if data.get("kind") != "final":
        errors.append("kind 必须为 'final'")
    if not data.get("text"):
        errors.append("text 不能为空")
    if data.get("parseMode") != "HTML":
        errors.append("parseMode 必须为 'HTML'")
    if not data.get("accountId"):
        errors.append("accountId 不能为空")
    chat_id = data.get("chatId")
    if not chat_id or not isinstance(chat_id, str):
        errors.append("chatId 必须为非空字符串")
    elif not chat_id.lstrip("-").isdigit():
        errors.append("chatId 必须为数字字符串")
    idemp = data.get("idempotencyKey", "")
    if not idemp.startswith("morning-brief:"):
        errors.append("idempotencyKey 格式错误")
    brief_date = data.get("briefDate", "")
    if not _is_valid_date(brief_date):
        errors.append("briefDate 必须为 YYYY-MM-DD")
    elif f":{brief_date}:" not in idemp:
        errors.append("briefDate 与 idempotencyKey 不一致")
    return errors


__all__ = [
    "PERSONAL_TEMPLATE_SCHEMA",
    "TRAVEL_OVERRIDE_SCHEMA",
    "FINAL_BRIEF_SCHEMA",
    "validate_template",
    "validate_override",
    "validate_final_brief",
    "load_schema",
]

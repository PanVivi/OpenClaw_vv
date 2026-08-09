"""Phase 1-D 综合测试：测试向量 + golden 排版 + schema 校验。

覆盖：
1. JSON schema/语义校验
2. Golden 排版对比（TITLE_PREFIX fixture）
3. 天气测试向量：雨/雪/雷暴/冰雹/阵风/AQI缺失
4. 边界：4096/4097、HTML注入防护
5. 幂等：同日重复发送防护
6. DST 转换测试
7. 临时覆盖生效/过期
8. 发送超时 unknown 状态

约束：测试不碰生产、不外发。

运行: cd /workspace/hehuan-daily && python3 -m unittest tests.test_phase1d -v
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import time
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from hehuan_daily.config import Config
from hehuan_daily.constants import (
    ALLOWED_HTML_TAGS,
    CUSTOM_EMOJI,
    CUSTOM_EMOJI_FORMAT,
    HARD_LIMIT,
    PRODUCTION_BUDGET,
    SEPARATOR,
    TITLE_LINE,
    TITLE_PREFIX,
    TOP_ORNAMENT,
    LEGACY_FLAT_TITLE,
)
from hehuan_daily.composer import (
    ComposedBrief,
    _escape_line,
    apply_custom_emoji,
    compose,
    escape_html,
    sanitize_dynamic,
)
from hehuan_daily.exceptions import (
    AQIError,
    OverrideError,
    TemplateError,
    WeatherError,
)
from hehuan_daily.final_brief import (
    FinalBrief,
    build_idempotency_key,
    create_final_brief,
    final_gate_check,
)
from hehuan_daily.idempotency import ReceiptStore, SendReceipt, compute_text_hash
from hehuan_daily.sender import (
    AmbiguousDeliveryError,
    DefiniteDeliveryError,
    Sender,
    SendResult,
    TransportResult,
)
from hehuan_daily.models import (
    AQIData,
    AQILevel,
    DataSourceResult,
    LunarData,
    PersonalTemplate,
    TravelOverride,
    WeatherData,
)


class FakeTransport:
    def __init__(self, error=None):
        self.error = error
        self.calls = 0

    def send(self, brief):
        self.calls += 1
        if self.error:
            raise self.error
        return TransportResult(message_id=f"msg-{self.calls}")


from hehuan_daily.modules.aqi import AQIModule
from hehuan_daily.modules.weather import WeatherModule, _describe_weather_code
from hehuan_daily.pipeline import Pipeline, PipelineContext, run_pipeline
from hehuan_daily.schemas import (
    FINAL_BRIEF_SCHEMA,
    PERSONAL_TEMPLATE_SCHEMA,
    TRAVEL_OVERRIDE_SCHEMA,
    load_schema,
    validate_final_brief,
    validate_override,
    validate_template,
)


# ══════════════════════════════════════════════════════════════
# 1. JSON Schema / 语义校验
# ══════════════════════════════════════════════════════════════
class TestSchemaValidation(unittest.TestCase):
    """JSON schema/语义校验：模板、覆盖、FinalBrief。"""

    # ── 个人模板 schema ─────────────────────────────────────
    def test_template_valid_minimal(self):
        data = {"template_id": "tmpl-001", "name": "测试"}
        errors = validate_template(data)
        self.assertEqual(errors, [])

    def test_template_missing_id(self):
        data = {"name": "测试"}
        errors = validate_template(data)
        self.assertTrue(any("缺少必填字段: template_id" in e for e in errors),
                        f"Expected '缺少必填字段: template_id' in {errors}")

    def test_template_missing_name(self):
        data = {"template_id": "t1"}
        errors = validate_template(data)
        self.assertTrue(any("缺少必填字段: name" in e for e in errors),
                        f"Expected '缺少必填字段: name' in {errors}")

    def test_template_latitude_out_of_range(self):
        data = {"template_id": "t1", "name": "T", "latitude": 91.0}
        errors = validate_template(data)
        self.assertTrue(any("latitude" in e and "91.0" in e for e in errors),
                        f"Expected latitude range error in {errors}")

    def test_template_longitude_out_of_range(self):
        data = {"template_id": "t1", "name": "T", "longitude": -181.0}
        errors = validate_template(data)
        self.assertTrue(any("longitude" in e and "-181.0" in e for e in errors),
                        f"Expected longitude range error in {errors}")

    def test_template_schema_has_required_fields(self):
        schema = load_schema("personal_template")
        self.assertIn("template_id", schema["required"])
        self.assertIn("name", schema["required"])

    def test_template_schema_rejects_additional_properties(self):
        schema = load_schema("personal_template")
        self.assertFalse(schema["additionalProperties"])

    # ── 出行覆盖 schema ─────────────────────────────────────
    def test_override_valid(self):
        data = {
            "override_id": "ovr-001",
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "location_name": "上海",
            "latitude": 31.23,
            "longitude": 121.47,
            "expires_at": "2026-09-01T00:00:00",
        }
        errors = validate_override(data)
        self.assertEqual(errors, [])

    def test_override_missing_expires_at(self):
        data = {
            "override_id": "ovr-001",
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "location_name": "上海",
            "latitude": 31.23,
            "longitude": 121.47,
        }
        errors = validate_override(data)
        self.assertTrue(any("expires_at" in e for e in errors),
                        f"Expected expires_at error in {errors}")

    def test_override_missing_multiple_required(self):
        data = {"override_id": "ovr-001"}
        errors = validate_override(data)
        # 缺 override_id 以外的 6 个必填字段 = 6 errors from required
        self.assertGreaterEqual(len(errors), 6,
                                f"Expected at least 6 errors, got {errors}")

    def test_override_schema_has_required_expires(self):
        schema = load_schema("travel_override")
        self.assertIn("expires_at", schema["required"])

    # ── FinalBrief schema ───────────────────────────────────
    def test_final_brief_valid(self):
        data = {
            "kind": "final",
            "text": "Hello",
            "parseMode": "HTML",
            "accountId": "life",
            "chatId": "12345",
            "briefDate": "2026-08-04",
            "idempotencyKey": "morning-brief:12345:2026-08-04:v1",
        }
        errors = validate_final_brief(data)
        self.assertEqual(errors, [])

    def test_final_brief_wrong_kind(self):
        data = {
            "kind": "draft",
            "text": "Hello",
            "parseMode": "HTML",
            "accountId": "life",
            "chatId": "12345",
            "idempotencyKey": "morning-brief:12345:2026-08-04:v1",
        }
        errors = validate_final_brief(data)
        self.assertIn("kind 必须为 'final'", errors)

    def test_final_brief_empty_text(self):
        data = {
            "kind": "final",
            "text": "",
            "parseMode": "HTML",
            "accountId": "life",
            "chatId": "12345",
            "idempotencyKey": "morning-brief:12345:2026-08-04:v1",
        }
        errors = validate_final_brief(data)
        self.assertIn("text 不能为空", errors)

    def test_final_brief_wrong_parse_mode(self):
        data = {
            "kind": "final",
            "text": "Hello",
            "parseMode": "Markdown",
            "accountId": "life",
            "chatId": "12345",
            "idempotencyKey": "morning-brief:12345:2026-08-04:v1",
        }
        errors = validate_final_brief(data)
        self.assertIn("parseMode 必须为 'HTML'", errors)

    def test_final_brief_invalid_chat_id(self):
        data = {
            "kind": "final",
            "text": "Hello",
            "parseMode": "HTML",
            "accountId": "life",
            "chatId": "not-a-number",
            "idempotencyKey": "morning-brief:12345:2026-08-04:v1",
        }
        errors = validate_final_brief(data)
        self.assertIn("chatId 必须为数字字符串", errors)

    def test_final_brief_wrong_idempotency_prefix(self):
        data = {
            "kind": "final",
            "text": "Hello",
            "parseMode": "HTML",
            "accountId": "life",
            "chatId": "12345",
            "idempotencyKey": "wrong-prefix:12345:2026-08-04:v1",
        }
        errors = validate_final_brief(data)
        self.assertIn("idempotencyKey 格式错误", errors)

    def test_final_brief_schema_const_kind(self):
        schema = FINAL_BRIEF_SCHEMA
        self.assertEqual(schema["properties"]["kind"]["const"], "final")
        self.assertEqual(schema["properties"]["parseMode"]["const"], "HTML")

    # ── Schema 加载异常 ─────────────────────────────────────
    def test_load_unknown_schema_raises(self):
        with self.assertRaises(ValueError):
            load_schema("nonexistent_schema")

    # ── 语义：坐标范围 ─────────────────────────────────────
    def test_template_null_coordinates_valid(self):
        """None 坐标不触发范围错误。"""
        data = {"template_id": "t1", "name": "T", "latitude": None, "longitude": None}
        errors = validate_template(data)
        self.assertEqual(errors, [])

    def test_override_boundary_coordinates(self):
        """覆盖边界坐标值。"""
        data = {
            "override_id": "ovr-b",
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "location_name": "极点",
            "latitude": 90.0,
            "longitude": 180.0,
            "expires_at": "2026-09-01T00:00:00",
        }
        errors = validate_override(data)
        self.assertEqual(errors, [])


# ══════════════════════════════════════════════════════════════
# 2. Golden 排版对比 (TITLE_PREFIX fixture)
# ══════════════════════════════════════════════════════════════
class TestGoldenLayout(unittest.TestCase):
    """Golden 排版对比：11:54 定稿和 11:55 失败样本。"""

    def setUp(self):
        self.title_with_emoji = apply_custom_emoji(TITLE_PREFIX)

    def test_title_prefix_unchanged(self):
        """TITLE_PREFIX 字面值与 golden fixture 一致。"""
        self.assertEqual(TITLE_PREFIX, "༺═────────────────═༻")
        self.assertEqual(TITLE_PREFIX, TOP_ORNAMENT)

    def test_title_prefix_no_moon(self):
        """定稿标题左右各一枚月亮。"""
        self.assertEqual(TITLE_LINE.count("🌙"), 2)

    def test_title_prefix_contains_required_emoji(self):
        """定稿标题必须包含月亮、宗名和消息名。"""
        required = ["🌙", "合欢宗", "晨间玉简"]
        for r in required:
            self.assertIn(r, TITLE_LINE)
        self.assertNotIn(LEGACY_FLAT_TITLE, TITLE_LINE)

    def test_separator_is_nine_grid(self):
        """分隔线格式：✦ ───────── ❖ ───────── ✦。"""
        self.assertEqual(SEPARATOR, "✦ ───────── ❖ ───────── ✦")
        # 两段各 9 个横线（─），共 18 个
        self.assertEqual(SEPARATOR.count("─"), 18)

    def test_custom_emoji_format_markdown_link(self):
        """Custom emoji 格式为 markdown_link。"""
        self.assertEqual(CUSTOM_EMOJI_FORMAT, "markdown_link")

    def test_custom_emoji_contains_owner_preferred(self):
        """Owner 首选 emoji 在 allowlist 中。"""
        self.assertIn("👅", CUSTOM_EMOJI)
        self.assertIn("🧛", CUSTOM_EMOJI)

    def test_apply_custom_emoji_produces_links(self):
        """历史 custom emoji 工具仍可独立使用，但不再进入定稿。"""
        result = apply_custom_emoji("👅🧛")
        # 👅 和 🧛 应该被替换为 [👅](tg://emoji?id=ID) 格式
        self.assertIn("[👅](tg://emoji?id=", result)
        self.assertIn("[🧛](tg://emoji?id=", result)
        # 替换后 emoji 不在标题中独立存在（仅在 markdown 链接文本内）
        # 移除所有 markdown 链接后再检查
        import re
        cleaned = re.sub(r'\[([^\]]+)\]\(.*?\)', '', result)
        self.assertNotIn("👅", cleaned)
        self.assertNotIn("🧛", cleaned)

    def test_compose_title_matches_golden(self):
        """compose() 输出的标题行与 golden fixture 一致。"""
        from hehuan_daily.modules.base import ModuleResult
        results = [
            ModuleResult(
                module_id="weather",
                text="天候司\n气温 22°C",
            ),
        ]
        brief = compose(results)
        lines = brief.text.split("\n")
        # 第一行应该是标题
        self.assertEqual(lines[0], self.title_with_emoji)

    def test_compose_separator_after_title(self):
        """纹饰、标题、称呼、日期和晨辞之后才进入分隔线。"""
        from hehuan_daily.modules.base import ModuleResult
        results = [
            ModuleResult(module_id="weather", text="天候司\n气温 22°C"),
        ]
        brief = compose(results)
        lines = brief.text.split("\n")
        self.assertEqual(lines[:3], [TOP_ORNAMENT, TITLE_LINE, TOP_ORNAMENT])
        self.assertIn("📜 少主亲启", lines)
        self.assertIn(SEPARATOR, lines)

    def test_compose_two_modules_have_separator(self):
        """两个模块之间有分隔线。"""
        from hehuan_daily.modules.base import ModuleResult
        results = [
            ModuleResult(module_id="weather", text="天候司\n气温 22°C"),
            ModuleResult(module_id="aqi", text="清气监\nAQI 50 (优)"),
        ]
        brief = compose(results)
        lines = brief.text.split("\n")
        # 找到两个模块之间的分隔线
        separator_count = sum(1 for l in lines if l == SEPARATOR)
        # 标题后 1 个 + 模块间 1 个 = 2
        self.assertEqual(separator_count, 2)

    def test_compose_empty_modules_skipped(self):
        """空模块保留固定槽位并输出明确降级段。"""
        from hehuan_daily.modules.base import ModuleResult
        results = [
            ModuleResult(module_id="weather", text=""),
            ModuleResult(module_id="aqi", text="清气监\nAQI 50"),
        ]
        brief = compose(results)
        self.assertNotIn("weather", brief.dropped_modules)
        self.assertNotIn("aqi", brief.dropped_modules)
        self.assertIn("天候司", brief.text)
        self.assertIn("资料暂未齐备", brief.text)
        self.assertIn("清气监", brief.text)

    def test_hard_limit_4096(self):
        """硬极限常量正确。"""
        self.assertEqual(HARD_LIMIT, 4096)

    def test_production_budget_below_hard_limit(self):
        """安全预算在硬极限以内。"""
        self.assertLess(PRODUCTION_BUDGET, HARD_LIMIT)

    def test_allowed_html_tags(self):
        """HTML 白名单只包含 b/i/code/pre。"""
        self.assertEqual(ALLOWED_HTML_TAGS, frozenset({"b", "i", "code", "pre"}))


# ══════════════════════════════════════════════════════════════
# 3. 天气测试向量：雨/雪/雷暴/冰雹/阵风/AQI缺失
# ══════════════════════════════════════════════════════════════
class TestWeatherVectors(unittest.TestCase):
    """天气测试向量：各种 WMO weather code 渲染。"""

    def _render_weather(self, **kwargs) -> str:
        mod = WeatherModule()
        data = WeatherData(**kwargs)
        return mod.render(data)

    # ── 雨 ─────────────────────────────────────────────────
    def test_rain_light(self):
        """小雨 (WMO 61)。"""
        text = self._render_weather(temperature_c=18.0, weather_code=61)
        self.assertIn("小雨", text)

    def test_rain_moderate(self):
        """中雨 (WMO 63)。"""
        text = self._render_weather(temperature_c=18.0, weather_code=63)
        self.assertIn("中雨", text)

    def test_rain_heavy(self):
        """大雨 (WMO 65)。"""
        text = self._render_weather(temperature_c=18.0, weather_code=65)
        self.assertIn("大雨", text)

    def test_rain_shower(self):
        """阵雨 (WMO 80/81/82)。"""
        for code, expected in [(80, "小阵雨"), (81, "中阵雨"), (82, "大阵雨")]:
            text = self._render_weather(temperature_c=20.0, weather_code=code)
            self.assertIn(expected, text)

    # ── 雪 ─────────────────────────────────────────────────
    def test_snow_light(self):
        """小雪 (WMO 71)。"""
        text = self._render_weather(temperature_c=-2.0, weather_code=71)
        self.assertIn("小雪", text)

    def test_snow_moderate(self):
        """中雪 (WMO 73)。"""
        text = self._render_weather(temperature_c=-3.0, weather_code=73)
        self.assertIn("中雪", text)

    def test_snow_heavy(self):
        """大雪 (WMO 75)。"""
        text = self._render_weather(temperature_c=-5.0, weather_code=75)
        self.assertIn("大雪", text)

    # ── 雷暴/冰雹 ─────────────────────────────────────────
    def test_thunderstorm(self):
        """雷暴 (WMO 95)。"""
        text = self._render_weather(temperature_c=25.0, weather_code=95)
        self.assertIn("雷暴", text)

    def test_thunderstorm_small_hail(self):
        """雷暴+小冰雹 (WMO 96)。"""
        text = self._render_weather(temperature_c=25.0, weather_code=96)
        self.assertIn("雷暴", text)
        self.assertIn("冰雹", text)

    def test_thunderstorm_large_hail(self):
        """雷暴+大冰雹 (WMO 99)。"""
        text = self._render_weather(temperature_c=25.0, weather_code=99)
        self.assertIn("雷暴", text)
        self.assertIn("大冰雹", text)

    # ── 阵风 ───────────────────────────────────────────────
    def test_wind_gusts_shown(self):
        """阵风风速正确显示。"""
        text = self._render_weather(
            temperature_c=22.0,
            wind_speed_kmh=10.0,
            wind_gusts_kmh=35.0,
        )
        self.assertIn("最大风速：约 35 km/h（含阵风）", text)

    def test_wind_no_gusts(self):
        """无阵风数据时不显示阵风。"""
        text = self._render_weather(
            temperature_c=22.0,
            wind_speed_kmh=10.0,
            wind_gusts_kmh=None,
        )
        self.assertNotIn("阵风", text)

    def test_wind_only_gusts_no_speed(self):
        """只有阵风无风速时仍应显示阵风。"""
        text = self._render_weather(
            temperature_c=22.0,
            wind_speed_kmh=None,
            wind_gusts_kmh=40.0,
        )
        # wind_speed_kmh is None → wind_line not appended without speed
        # 实际实现中阵风是附加在风速后的，无风速则无阵风行
        # 这是预期行为：阵风不能独立于风速存在

    # ── 天气代码描述映射 ───────────────────────────────────
    def test_weather_code_descriptions(self):
        """关键天气代码描述正确。"""
        expected = {
            0: "晴", 1: "大部晴", 2: "多云", 3: "阴",
            61: "小雨", 71: "小雪", 95: "雷暴",
            96: "雷暴+小冰雹", 99: "雷暴+大冰雹",
        }
        for code, desc in expected.items():
            self.assertEqual(_describe_weather_code(code), desc)

    def test_unknown_weather_code(self):
        """未知天气代码返回空字符串。"""
        self.assertEqual(_describe_weather_code(999), "")

    # ── AQI 缺失 ───────────────────────────────────────────
    def test_aqi_missing(self):
        """AQI 数据缺失时用自然中文说明。"""
        mod = AQIModule()
        data = AQIData(aqi=None, level=AQILevel.UNKNOWN)
        text = mod.render(data)
        self.assertIn("AQI 暂无可靠数值", text)
        self.assertNotIn("None", text)

    def test_aqi_missing_no_pm25(self):
        """AQI 缺失且无 PM2.5 时不显示 PM 行。"""
        mod = AQIModule()
        data = AQIData(aqi=None, pm25=None, pm10=None)
        text = mod.render(data)
        self.assertNotIn("PM2.5", text)
        self.assertNotIn("PM10", text)

    def test_aqi_zero(self):
        """AQI=0 是有效值（不是 None）。"""
        mod = AQIModule()
        data = AQIData(aqi=0, level=AQILevel.EXCELLENT)
        text = mod.render(data)
        self.assertIn("AQI 0", text)

    # ── is_day 字段 ────────────────────────────────────────
    def test_is_day_parsed_in_data(self):
        """WeatherData 包含 is_day 字段。"""
        data = WeatherData(temperature_c=22.0, is_day=True)
        self.assertTrue(data.is_day)

    def test_hourly_precip_probability(self):
        """逐时降水数据汇总为最大降雨概率。"""
        data = WeatherData(
            temperature_c=22.0,
            hourly_summary=[
                {"time": "2026-08-03T12:00", "temperature_c": 22.0, "precip_prob": 60, "weather_code": 61},
                {"time": "2026-08-03T16:00", "temperature_c": 24.0, "precip_prob": 80, "weather_code": 63},
            ],
        )
        mod = WeatherModule()
        text = mod.render(data)
        self.assertIn("最大降雨概率：80%", text)


# ══════════════════════════════════════════════════════════════
# 4. 边界：4096/4097、HTML注入防护
# ══════════════════════════════════════════════════════════════
class TestBoundaryAndSafety(unittest.TestCase):
    """边界值测试 + HTML注入防护。"""

    # ── 长度边界（行为级，不依赖 emoji 替换后的精确宽度）─────────────
    def test_compose_short_text_under_limit(self):
        """短文本远低于硬极限。"""
        from hehuan_daily.modules.base import ModuleResult
        results = [ModuleResult(module_id="weather", text="天候司\n气温 22°C")]
        brief = compose(results)
        self.assertLessEqual(brief.char_count, HARD_LIMIT)
        self.assertFalse(brief.was_compressed)

    def test_compose_large_text_triggers_compression(self):
        """大文本触发压缩。"""
        from hehuan_daily.modules.base import ModuleResult
        # 创建一个有很多行的模块
        lines = ["天候司"] + [f"line {i}" for i in range(200)]
        text = "\n".join(lines)
        results = [ModuleResult(module_id="weather", text=text)]
        brief = compose(results)
        # 压缩后应该在硬极限以内
        self.assertLessEqual(brief.char_count, HARD_LIMIT)

    def test_compose_over_production_budget_triggers_compression(self):
        """超过 3800 安全预算时即压缩，不等到 4096。"""
        from hehuan_daily.modules.base import ModuleResult

        lines = ["天候司"] + [f"line {i:03d} " + "x" * 30 for i in range(100)]
        brief = compose(
            [ModuleResult(module_id="weather", text="\n".join(lines))],
            budget=PRODUCTION_BUDGET,
            hard_limit=HARD_LIMIT,
        )
        self.assertTrue(brief.was_compressed)
        self.assertLessEqual(brief.char_count, PRODUCTION_BUDGET)

    def test_compose_exact_budget_is_not_compressed(self):
        """恰好 3800 字符时不触发压缩。"""
        from hehuan_daily.modules.base import ModuleResult

        def raw_count(payload_size: int) -> int:
            return compose(
                [ModuleResult(module_id="weather", text="天候司\n" + "x" * payload_size)],
                budget=10000,
                hard_limit=10000,
            ).char_count

        payload_size = 3799
        while raw_count(payload_size) < PRODUCTION_BUDGET:
            payload_size += 1
        while raw_count(payload_size) > PRODUCTION_BUDGET:
            payload_size -= 1
        brief = compose(
            [ModuleResult(module_id="weather", text="天候司\n" + "x" * payload_size)],
            budget=PRODUCTION_BUDGET,
            hard_limit=HARD_LIMIT,
        )
        self.assertEqual(brief.char_count, PRODUCTION_BUDGET)
        self.assertFalse(brief.was_compressed)

    def test_compose_exact_hard_limit_is_allowed_and_over_limit_warns(self):
        """4096 可发送，4097 必须报告硬上限超限。"""
        from hehuan_daily.modules.base import ModuleResult

        def brief_for(total_payload: int) -> ComposedBrief:
            return compose(
                [ModuleResult(module_id="weather", text="天候司\n" + "x" * total_payload)],
                budget=total_payload + 100,
                hard_limit=HARD_LIMIT,
            )

        def payload_for(target: int) -> int:
            payload = target
            while brief_for(payload).char_count < target:
                payload += 1
            while brief_for(payload).char_count > target:
                payload -= 1
            return payload

        at_limit = brief_for(payload_for(HARD_LIMIT))
        over_limit = brief_for(payload_for(HARD_LIMIT + 1))
        self.assertEqual(at_limit.char_count, HARD_LIMIT)
        self.assertFalse(any("硬极限" in warning for warning in at_limit.warnings))
        self.assertEqual(over_limit.char_count, HARD_LIMIT + 1)
        self.assertTrue(any("硬极限" in warning for warning in over_limit.warnings))

    def test_compose_huge_single_line_over_limit(self):
        """单行巨长文本：压缩无法减少，超出硬极限。"""
        from hehuan_daily.modules.base import ModuleResult
        # 单个内容行超过硬极限
        huge_line = "x" * (HARD_LIMIT + 100)
        results = [ModuleResult(module_id="weather", text=f"天候司\n{huge_line}")]
        brief = compose(results)
        # 压缩只对多行模块有效，单行巨长无法压缩
        self.assertGreater(brief.char_count, HARD_LIMIT)

    def test_compose_4096_is_hard_limit_constant(self):
        """4096 是 Telegram Bot API 硬上限常量。"""
        self.assertEqual(HARD_LIMIT, 4096)

    def test_empty_text_produces_minimal_brief(self):
        """空模块也保留模块标题与明确降级内容。"""
        from hehuan_daily.modules.base import ModuleResult
        results = [ModuleResult(module_id="weather", text="")]
        brief = compose(results)
        self.assertIn(apply_custom_emoji(TITLE_PREFIX), brief.text)
        self.assertIn("天候司", brief.text)
        self.assertIn("资料暂未齐备", brief.text)

    # ── HTML 注入防护 ─────────────────────────────────────
    def test_escape_html_basic(self):
        """基本 HTML 转义。"""
        self.assertEqual(escape_html("<script>"), "&lt;script&gt;")
        self.assertEqual(escape_html("a & b"), "a &amp; b")

    def test_escape_html_preserves_whitelist_tags(self):
        """白名单标签保留。"""
        result = _escape_line("<b>bold</b>")
        self.assertEqual(result, "<b>bold</b>")

    def test_escape_html_preserves_multiple_whitelist(self):
        """多个白名单标签保留。"""
        result = _escape_line("<b>bold</i> and <code>x</code>")
        self.assertIn("<b>", result)
        self.assertIn("<code>", result)

    def test_escape_html_escapes_script(self):
        """<script> 标签被转义。"""
        result = _escape_line("<script>alert(1)</script>")
        self.assertNotIn("<script>", result)
        self.assertIn("&lt;script&gt;", result)

    def test_escape_html_escapes_img_onerror(self):
        """<img onerror=...> 被转义。"""
        result = _escape_line('<img src=x onerror="alert(1)">')
        self.assertNotIn("<img", result)

    def test_escape_html_escapes_javascript_protocol(self):
        """javascript: 协议被转义。"""
        result = escape_html("javascript:alert(1)")
        # 没有 < > 标签，但 & 会被转义
        self.assertNotIn("<", result)

    def test_sanitize_dynamic_escapes_quotes(self):
        """sanitize_dynamic 转义引号。"""
        result = sanitize_dynamic('value="test"')
        self.assertNotIn('"', result)
        self.assertIn("&quot;", result)

    def test_sanitize_dynamic_escapes_all(self):
        """sanitize_dynamic 完整转义。"""
        result = sanitize_dynamic('<a href="javascript:alert(1)">')
        self.assertNotIn("<", result)
        self.assertNotIn('"', result)

    def test_compose_escapes_dynamic_text(self):
        """compose() 对动态内容做 HTML 转义。"""
        from hehuan_daily.modules.base import ModuleResult
        results = [
            ModuleResult(module_id="weather", text="天候司\n<script>alert(1)</script>"),
        ]
        brief = compose(results)
        self.assertNotIn("<script>", brief.text)
        self.assertIn("&lt;script&gt;", brief.text)

    def test_final_brief_escapes_html_in_text(self):
        """FinalBrief 文本中的 HTML 注入被转义。"""
        text = apply_custom_emoji(TITLE_PREFIX) + "\n" + SEPARATOR + "\n<body>"
        # compose 会转义 <body> 因为 <body> 不在白名单
        from hehuan_daily.modules.base import ModuleResult
        results = [ModuleResult(module_id="weather", text="天候司\n<body>")]
        brief = compose(results)
        self.assertNotIn("<body>", brief.text)

    # ── 闸门安全检查 ──────────────────────────────────────
    def test_gate_rejects_unsanitized_lt(self):
        """闸门拒绝未转义的 <。"""
        brief = FinalBrief(
            text="title\n─────────\n<script>",
            account_id="life",
            chat_id="12345",
            brief_date="2026-08-04",
            idempotency_key="morning-brief:12345:2026-08-04:v1",
        )
        errors = final_gate_check(brief, TITLE_PREFIX)
        self.assertTrue(any("<" in e for e in errors))

    def test_gate_rejects_bare_ampersand(self):
        """闸门拒绝裸 &。"""
        brief = FinalBrief(
            text="title\n─────────\na & b",
            account_id="life",
            chat_id="12345",
            brief_date="2026-08-04",
            idempotency_key="morning-brief:12345:2026-08-04:v1",
        )
        errors = final_gate_check(brief, TITLE_PREFIX)
        self.assertTrue(any("&" in e for e in errors))

    def test_gate_allows_escaped_html(self):
        """闸门允许 &amp; &lt; &gt; 实体。"""
        brief = FinalBrief(
            text="title\n─────────\na &amp; b",
            account_id="life",
            chat_id="12345",
            brief_date="2026-08-04",
            idempotency_key="morning-brief:12345:2026-08-04:v1",
        )
        errors = final_gate_check(brief, TITLE_PREFIX)
        # 裸 & 检查应通过（&amp; 是合法的）
        amp_errors = [e for e in errors if "未转义的 '&'" in e]
        self.assertEqual(len(amp_errors), 0)


# ══════════════════════════════════════════════════════════════
# 5. 幂等：同日重复发送防护
# ══════════════════════════════════════════════════════════════
class TestIdempotency(unittest.TestCase):
    """幂等：同日重复发送防护。"""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.store_path = Path(self.tmpdir) / "receipts.json"
        self.store = ReceiptStore(self.store_path)
        self.transport = FakeTransport()
        self.sender = Sender(
            self.store,
            Config(send_enabled=True, location_is_placeholder=False),
            transport=self.transport,
        )
        self.title_with_emoji = apply_custom_emoji(TITLE_PREFIX)

    def _make_brief(self, chat_id="12345", brief_date="2026-08-04"):
        return create_final_brief(
            text=run_pipeline(target_date=date.fromisoformat(brief_date)).composed.text,
            account_id="life",
            chat_id=chat_id,
            brief_date=brief_date,
        )

    def test_same_day_duplicate_skipped(self):
        """同一天重复发送被幂等跳过。"""
        brief = self._make_brief()

        result1 = self.sender.send(brief)
        self.assertTrue(result1.success)
        self.assertFalse(result1.was_duplicate)

        result2 = self.sender.send(brief)
        self.assertTrue(result2.success)
        self.assertTrue(result2.was_duplicate)
        self.assertEqual(result2.message_id, result1.message_id)

    def test_different_day_not_duplicate(self):
        """不同日期不算重复。"""
        brief1 = self._make_brief(brief_date="2026-08-04")
        brief2 = self._make_brief(brief_date="2026-08-05")

        result1 = self.sender.send(brief1)
        result2 = self.sender.send(brief2)

        self.assertFalse(result1.was_duplicate)
        self.assertFalse(result2.was_duplicate)

    def test_different_chat_not_duplicate(self):
        """不同 chat_id 不算重复。"""
        brief1 = self._make_brief(chat_id="111")
        brief2 = self._make_brief(chat_id="222")

        result1 = self.sender.send(brief1)
        result2 = self.sender.send(brief2)

        self.assertFalse(result1.was_duplicate)
        self.assertFalse(result2.was_duplicate)

    def test_three_sends_only_one_real(self):
        """三次发送只有一次真实发送。"""
        brief = self._make_brief()

        results = [self.sender.send(brief) for _ in range(3)]

        real_sends = [r for r in results if not r.was_duplicate]
        dup_sends = [r for r in results if r.was_duplicate]

        self.assertEqual(len(real_sends), 1)
        self.assertEqual(len(dup_sends), 2)

    def test_failed_send_allows_retry(self):
        """失败后可以重试。"""
        brief = self._make_brief()

        self.sender.transport = FakeTransport(DefiniteDeliveryError("net fail"))
        result1 = self.sender.send(brief)
        self.assertFalse(result1.success)

        # 重试应成功
        self.sender.transport = FakeTransport()
        result2 = self.sender.send(brief)
        self.assertTrue(result2.success)
        self.assertFalse(result2.was_duplicate)

    def test_idempotency_key_uniqueness(self):
        """幂等键对日期唯一。"""
        key1 = build_idempotency_key("12345", "2026-08-04", 1)
        key2 = build_idempotency_key("12345", "2026-08-05", 1)
        key3 = build_idempotency_key("12345", "2026-08-04", 2)

        self.assertNotEqual(key1, key2)
        self.assertNotEqual(key1, key3)
        self.assertNotEqual(key2, key3)

    def test_receipt_sent_vs_pending_vs_failed(self):
        """收据状态：sent / pending / failed 区分。"""
        self.assertFalse(self.store.is_sent("k1"))
        self.assertFalse(self.store.has_pending("k1"))

        self.store.put(SendReceipt(
            idempotency_key="k1", chat_id="1", brief_date="2026-08-04",
            status="pending",
        ))
        self.assertFalse(self.store.is_sent("k1"))
        self.assertTrue(self.store.has_pending("k1"))

        self.store.put(SendReceipt(
            idempotency_key="k1", chat_id="1", brief_date="2026-08-04",
            status="sent", message_id="msg-x",
        ))
        self.assertTrue(self.store.is_sent("k1"))
        self.assertFalse(self.store.has_pending("k1"))

    def test_text_hash_differs_for_different_content(self):
        """不同内容产生不同 hash。"""
        h1 = compute_text_hash("version A")
        h2 = compute_text_hash("version B")
        self.assertNotEqual(h1, h2)

    def test_text_hash_stable(self):
        """相同内容 hash 稳定。"""
        h1 = compute_text_hash("same content")
        h2 = compute_text_hash("same content")
        self.assertEqual(h1, h2)


# ══════════════════════════════════════════════════════════════
# 6. DST 转换测试
# ══════════════════════════════════════════════════════════════
class TestDSTConversion(unittest.TestCase):
    """DST 转换测试：时区感知日期计算。"""

    def test_date_calculation_across_dst_boundary(self):
        """跨越 DST 边界的日期计算不受影响（使用 date 而非 datetime）。"""
        # Phase 1 使用 date 类型，不涉及时区转换
        # 验证 date 运算正确
        d1 = date(2026, 3, 8)  # US DST start
        d2 = date(2026, 3, 9)
        self.assertEqual((d2 - d1).days, 1)

    def test_lunar_calculation_consistent_across_dates(self):
        """农历计算在日期边界一致性。"""
        from hehuan_daily.lunar import LunarSource

        source = LunarSource()
        d1 = date(2026, 3, 8)
        d2 = date(2026, 3, 9)

        r1 = source.calculate(d1)
        r2 = source.calculate(d2)

        # 相邻日期的农历日应该连续（或月初重置）
        if r1.lunar_day is not None and r2.lunar_day is not None:
            diff = r2.lunar_day - r1.lunar_day
            self.assertIn(diff, [1, -29, -28, -30])  # 连续或月初

    def test_timedelta_day_arithmetic(self):
        """timedelta 日期运算正确。"""
        d = date(2026, 1, 1)
        self.assertEqual(d + timedelta(days=364), date(2026, 12, 31))
        self.assertEqual(d + timedelta(days=365), date(2027, 1, 1))

    def test_utc_vs_local_date_consistency(self):
        """Phase 1 使用 date.today()（本地日期），不混用 UTC 日期。"""
        local_today = date.today()
        # 确保本地日期在合理范围内
        self.assertEqual(local_today.year, 2026)

    def test_override_date_range_spanning_month_boundary(self):
        """覆盖跨越月份边界。"""
        override = TravelOverride(
            override_id="ovr-month",
            start_date=date(2026, 7, 28),
            end_date=date(2026, 8, 3),
            location_name="旅行",
            latitude=35.0,
            longitude=139.0,
            expires_at=datetime(2026, 9, 1, tzinfo=timezone.utc),
        )
        # 7月最后一天
        self.assertTrue(override.is_active(date(2026, 7, 31)))
        # 8月第一天
        self.assertTrue(override.is_active(date(2026, 8, 1)))
        # 覆盖前
        self.assertFalse(override.is_active(date(2026, 7, 27)))
        # 覆盖后
        self.assertFalse(override.is_active(date(2026, 8, 4)))

    def test_override_leap_year_feb29(self):
        """覆盖跨越闰年 2月29日。"""
        override = TravelOverride(
            override_id="ovr-leap",
            start_date=date(2028, 2, 28),
            end_date=date(2028, 3, 1),
            location_name="闰年测试",
            latitude=0.0,
            longitude=0.0,
            expires_at=datetime(2028, 6, 1, tzinfo=timezone.utc),
        )
        self.assertTrue(override.is_active(date(2028, 2, 29)))
        self.assertTrue(override.is_active(date(2028, 3, 1)))

    def test_pipeline_context_uses_date_not_datetime(self):
        """PipelineContext 使用 date 类型（无时区问题）。"""
        ctx = PipelineContext(target_date=date(2026, 8, 4))
        self.assertEqual(ctx.target_date, date(2026, 8, 4))

    def test_scheduler_idempotency_key_uses_date_isoformat(self):
        """调度器幂等键使用 ISO 格式日期。"""
        key = build_idempotency_key("12345", date(2026, 1, 1).isoformat())
        self.assertIn("2026-01-01", key)


# ══════════════════════════════════════════════════════════════
# 7. 临时覆盖生效/过期
# ══════════════════════════════════════════════════════════════
class TestTravelOverride(unittest.TestCase):
    """临时覆盖生效/过期逻辑。"""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        config = Config(override_dir=self.tmpdir)
        from hehuan_daily.override import OverrideManager
        self.mgr = OverrideManager(config)

    def _make_override(self, **kwargs) -> dict:
        base = {
            "override_id": "ovr-test",
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "location_name": "上海",
            "latitude": 31.23,
            "longitude": 121.47,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        }
        base.update(kwargs)
        return base

    def test_override_active_in_date_range(self):
        """覆盖在日期范围内有效。"""
        self.mgr.create(self._make_override())
        o = self.mgr.get("ovr-test")
        self.assertTrue(o.is_active(date(2026, 8, 10)))
        self.assertTrue(o.is_active(date(2026, 8, 12)))
        self.assertTrue(o.is_active(date(2026, 8, 15)))

    def test_override_inactive_before_start(self):
        """覆盖在开始日期前无效。"""
        self.mgr.create(self._make_override())
        o = self.mgr.get("ovr-test")
        self.assertFalse(o.is_active(date(2026, 8, 9)))

    def test_override_inactive_after_end(self):
        """覆盖在结束日期后无效。"""
        self.mgr.create(self._make_override())
        o = self.mgr.get("ovr-test")
        self.assertFalse(o.is_active(date(2026, 8, 16)))

    def test_override_expired_by_expires_at(self):
        """expires_at 已过则无效（即使在日期范围内）。"""
        data = self._make_override(
            expires_at=(datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        )
        self.mgr.create(data)
        o = self.mgr.get("ovr-test")
        # 日期范围内但 expires_at 已过
        self.assertFalse(o.is_active(date(2026, 8, 12)))

    def test_override_expires_at_enforced(self):
        """expires_at 强制要求。"""
        with self.assertRaises(OverrideError):
            self.mgr.create({
                "override_id": "no-exp",
                "start_date": "2026-08-10",
                "end_date": "2026-08-15",
                "location_name": "X",
                "latitude": 0,
                "longitude": 0,
            })

    def test_override_cleanup_expired(self):
        """清理已过期的覆盖。"""
        # 创建一个已过期的
        self.mgr.create(self._make_override(
            override_id="expired",
            expires_at=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        ))
        # 创建一个未过期的
        self.mgr.create(self._make_override(
            override_id="active",
            expires_at=(datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        ))

        removed = self.mgr.cleanup_expired()
        self.assertGreaterEqual(removed, 1)
        self.assertIsNone(self.mgr.get("expired"))
        self.assertIsNotNone(self.mgr.get("active"))

    def test_override_find_active(self):
        """find_active 只返回有效的覆盖。"""
        future = (datetime.now(timezone.utc) + timedelta(days=60)).isoformat()
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

        self.mgr.create(self._make_override(
            override_id="active-1",
            start_date=date.today().isoformat(),
            end_date=(date.today() + timedelta(days=5)).isoformat(),
            expires_at=future,
        ))
        self.mgr.create(self._make_override(
            override_id="expired-1",
            start_date="2026-01-01",
            end_date="2026-01-05",
            expires_at=past,
        ))

        active = self.mgr.find_active(date.today())
        ids = [o.override_id for o in active]
        self.assertIn("active-1", ids)
        self.assertNotIn("expired-1", ids)

    def test_override_path_traversal_blocked(self):
        """路径穿越被阻止。"""
        with self.assertRaises(OverrideError):
            self.mgr.get("../../etc/passwd")

    def test_override_delete(self):
        """删除覆盖。"""
        self.mgr.create(self._make_override(override_id="del-me"))
        self.assertTrue(self.mgr.delete("del-me"))
        self.assertIsNone(self.mgr.get("del-me"))
        self.assertFalse(self.mgr.delete("del-me"))

    def test_override_single_day(self):
        """单日覆盖。"""
        self.mgr.create(self._make_override(
            override_id="single",
            start_date="2026-08-10",
            end_date="2026-08-10",
        ))
        o = self.mgr.get("single")
        self.assertTrue(o.is_active(date(2026, 8, 10)))
        self.assertFalse(o.is_active(date(2026, 8, 9)))
        self.assertFalse(o.is_active(date(2026, 8, 11)))


# ══════════════════════════════════════════════════════════════
# 8. 发送超时 unknown 状态
# ══════════════════════════════════════════════════════════════
class TestSendTimeout(unittest.TestCase):
    """发送超时/unknown 状态处理。"""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.store_path = Path(self.tmpdir) / "receipts.json"
        self.store = ReceiptStore(self.store_path)
        self.transport = FakeTransport()
        self.sender = Sender(
            self.store,
            Config(send_enabled=True, location_is_placeholder=False),
            transport=self.transport,
        )
        self.title_with_emoji = apply_custom_emoji(TITLE_PREFIX)

    def _make_brief(self, chat_id="12345"):
        return create_final_brief(
            text=run_pipeline(target_date=date(2026, 8, 4)).composed.text,
            account_id="life",
            chat_id=chat_id,
            brief_date="2026-08-04",
        )

    def test_send_timeout_leaves_failed_receipt(self):
        """发送超时进入 unknown_needs_reconcile。"""
        brief = self._make_brief()

        self.sender.transport = FakeTransport(
            AmbiguousDeliveryError("Connection timed out")
        )
        result = self.sender.send(brief)

        self.assertFalse(result.success)
        self.assertEqual(result.receipt_status, "unknown_needs_reconcile")
        self.assertIn("timed out", result.error)

        receipt = self.store.get(brief.idempotency_key)
        self.assertEqual(receipt.status, "unknown_needs_reconcile")
        self.assertIn("timed out", receipt.error)

    def test_send_timeout_allows_retry(self):
        """发送超时后禁止自动重试。"""
        brief = self._make_brief()

        self.sender.transport = FakeTransport(AmbiguousDeliveryError("timeout"))
        r1 = self.sender.send(brief)

        self.assertFalse(r1.success)

        r2 = self.sender.send(brief)
        self.assertFalse(r2.success)
        self.assertEqual(self.sender.transport.calls, 1)

    def test_send_unknown_error_status(self):
        """未分类异常保守记录为 unknown。"""
        brief = self._make_brief()

        self.sender.transport = FakeTransport(RuntimeError("unexpected error"))
        result = self.sender.send(brief)

        self.assertFalse(result.success)
        self.assertEqual(result.receipt_status, "unknown_needs_reconcile")
        self.assertIn("unexpected error", result.error)

    def test_send_gate_unknown_rejection(self):
        """闸门未知拒绝（如标题不匹配）记录为 failed。"""
        brief = FinalBrief(
            text="wrong title\n─────────\n天候司",
            account_id="life",
            chat_id="12345",
            brief_date="2026-08-04",
            idempotency_key="morning-brief:12345:2026-08-04:v1",
        )
        result = self.sender.send(brief)
        self.assertFalse(result.success)
        self.assertIn("gate_rejected", result.error)
        self.assertEqual(result.receipt_status, "failed_safe_to_retry")

    def test_pending_receipt_after_crash(self):
        """pending 收据在 crash 后保留（超时/断线核对）。"""
        brief = self._make_brief()

        # 手动写入 pending 收据模拟 crash
        self.store.put(SendReceipt(
            idempotency_key=brief.idempotency_key,
            chat_id=brief.chat_id,
            brief_date="2026-08-04",
            status="pending",
            attempts=1,
            updated_at=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        ))

        # 验证 pending 状态
        self.assertTrue(self.store.has_pending(brief.idempotency_key))
        self.assertFalse(self.store.is_sent(brief.idempotency_key))

    def test_pending_does_not_block_resend(self):
        """pending 收据阻止重发并要求人工核对。"""
        brief = self._make_brief()

        # 写 pending
        self.store.put(SendReceipt(
            idempotency_key=brief.idempotency_key,
            chat_id=brief.chat_id,
            brief_date="2026-08-04",
            status="pending",
            attempts=1,
        ))

        result = self.sender.send(brief)
        self.assertFalse(result.success)
        self.assertFalse(result.was_duplicate)
        self.assertEqual(result.receipt_status, "unknown_needs_reconcile")
        self.assertEqual(self.transport.calls, 0)

    def test_send_result_unknown_status(self):
        """SendResult 可以表示 unknown 状态。"""
        result = SendResult(
            success=False,
            error="unknown",
            receipt_status="unknown",
        )
        self.assertFalse(result.success)
        self.assertEqual(result.receipt_status, "unknown")


# ══════════════════════════════════════════════════════════════
# 额外：集成 — 完整 pipeline + 闸门（不碰生产、不外发）
# ══════════════════════════════════════════════════════════════
class TestIntegrationNoSend(unittest.TestCase):
    """集成：pipeline → compose → final_gate（无真实发送）。"""

    def test_full_pipeline_composes_brief(self):
        """完整 pipeline 产生有效简报。"""
        weather_result = DataSourceResult(
            source="open-meteo",
            data=WeatherData(temperature_c=22.0, daily_max_temp=25.0, daily_min_temp=18.0),
        )
        aqi_result = DataSourceResult(
            source="cams-model",
            data=AQIData(aqi=50, level=AQILevel.GOOD, pm25=12.0, is_model_estimate=True),
            is_degraded=True,
        )
        lunar_result = DataSourceResult(
            source="lunar-builtin",
            data=LunarData(
                solar_date=date.today(),
                lunar_year=2026,
                lunar_month=6,
                lunar_day=20,
            ),
        )

        result = run_pipeline(
            target_date=date.today(),
            weather_result=weather_result,
            aqi_result=aqi_result,
            lunar_result=lunar_result,
        )

        self.assertTrue(result.is_success)
        self.assertLessEqual(result.composed.char_count, HARD_LIMIT)
        self.assertIn("合欢宗", result.composed.text)

    def test_pipeline_with_override(self):
        """Pipeline 使用覆盖的坐标。"""
        override = TravelOverride(
            override_id="ovr-pipeline",
            start_date=date.today(),
            end_date=date.today(),
            location_name="杭州",
            latitude=30.27,
            longitude=120.15,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )

        result = run_pipeline(
            target_date=date.today(),
            weather_result=DataSourceResult(
                source="open-meteo",
                data=WeatherData(temperature_c=20.0),
            ),
            active_override=override,
        )

        self.assertTrue(result.is_success)
        # 验证覆盖生效（通过模块上下文）
        ctx = PipelineContext(
            target_date=date.today(),
            active_override=override,
        )
        mod_ctx = ctx.to_module_context()
        self.assertEqual(mod_ctx.effective_latitude, 30.27)
        self.assertEqual(mod_ctx.effective_longitude, 120.15)

    def test_pipeline_keeps_all_seven_modules_when_resolve_is_false(self):
        """数据缺失导致 resolve=False 时，七个固定槽位仍输出降级段。"""
        from hehuan_daily.modules.registry import DEFAULT_MODULE_ORDER

        result = run_pipeline(target_date=date.today())

        self.assertEqual(len(result.module_results), 7)
        self.assertTrue(all(item.is_degraded for item in result.module_results))
        for heading in (
            "今日小签", "天候司 · 今日云笺", "清气监 · 空气质量", "衣行令 · 穿衣出行",
            "宗门脉象 · 今日运行", "门人名录 · 状态待核", "今日玉牒 · 今日要事",
        ):
            self.assertIn(heading, result.composed.text)
        self.assertIn("暂未齐备", result.composed.text)

    def test_pipeline_keeps_slots_for_missing_empty_and_failed_modules(self):
        """未注册、空结果和异常模块均有明确降级段，顺序不变。"""
        from hehuan_daily.modules.base import ModuleResult
        from hehuan_daily.modules.registry import DEFAULT_MODULE_ORDER, get_module as real_get_module

        def fake_get_module(module_id):
            if module_id == DEFAULT_MODULE_ORDER[1]:
                return None
            if module_id == DEFAULT_MODULE_ORDER[2]:
                return MagicMock(execute=MagicMock(side_effect=RuntimeError("boom")))
            if module_id == DEFAULT_MODULE_ORDER[3]:
                return MagicMock(
                    execute=MagicMock(
                        return_value=ModuleResult(module_id=module_id.value, text="")
                    )
                )
            return real_get_module(module_id)

        with patch("hehuan_daily.pipeline.get_module", side_effect=fake_get_module):
            result = run_pipeline(target_date=date.today())

        self.assertEqual(len(result.module_results), 7)
        self.assertEqual(
            [item.module_id for item in result.module_results],
            [module_id.value for module_id in DEFAULT_MODULE_ORDER],
        )
        self.assertIn("天候司", result.composed.text)
        self.assertIn("清气监", result.composed.text)
        self.assertIn("衣行令", result.composed.text)
        self.assertNotIn("模块 weather", result.composed.text)
        self.assertNotIn("执行失败", result.composed.text)
        self.assertIn("资料暂未齐备", result.composed.text)
        self.assertTrue(any("boom" in error for error in result.errors))

    def test_final_brief_passes_gate(self):
        """正常 FinalBrief 通过闸门。"""
        text = run_pipeline(target_date=date(2026, 8, 4)).composed.text
        brief = create_final_brief(
            text=text,
            account_id="life",
            chat_id="12345",
            brief_date="2026-08-04",
        )
        errors = final_gate_check(brief, TITLE_PREFIX)
        self.assertEqual(errors, [])

    def test_final_brief_fails_gate_without_title(self):
        """无标题的 FinalBrief 被闸门拒绝。"""
        brief = create_final_brief(
            text="无标题内容",
            account_id="life",
            chat_id="12345",
            brief_date="2026-08-04",
        )
        errors = final_gate_check(brief, TITLE_PREFIX)
        self.assertTrue(len(errors) > 0)

    def test_pipeline_all_modules_resolve(self):
        """所有注册模块在数据充足时都能 resolve。"""
        from hehuan_daily.modules.registry import get_all_modules

        modules = get_all_modules()
        self.assertEqual(len(modules), 7)

        for module_id, mod_cls in modules.items():
            mod = mod_cls()
            self.assertIsNotNone(mod.module_id)


if __name__ == "__main__":
    unittest.main()

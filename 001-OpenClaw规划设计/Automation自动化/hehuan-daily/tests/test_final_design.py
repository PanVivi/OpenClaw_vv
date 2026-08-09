"""2026-08-04 11:54 定稿版式与 11:55 失败样本回归。"""

from __future__ import annotations

import os
import sys
import unittest
from datetime import date, datetime, time, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from hehuan_daily.cli import offline_preview
from hehuan_daily.constants import (
    CLOSING_WISH,
    LEGACY_FLAT_TITLE,
    SEPARATOR,
    TITLE_LINE,
    TOP_ORNAMENT,
)
from hehuan_daily.final_brief import create_final_brief, final_gate_check
from hehuan_daily.lunar import LunarSource
from hehuan_daily.models import (
    AQIData,
    AQILevel,
    DataSourceResult,
    PersonalTemplate,
    WeatherData,
)
from hehuan_daily.pipeline import run_pipeline


class TestFinalDesign(unittest.TestCase):
    def setUp(self):
        self.day = date(2026, 8, 4)
        self.weather = WeatherData(
            temperature_c=34,
            apparent_temperature_c=38,
            daily_min_temp=26,
            daily_max_temp=35,
            daily_max_apparent_temp=40,
            humidity_pct=70,
            wind_speed_kmh=9,
            wind_gusts_kmh=13,
            daily_max_precip_probability=61,
            daily_weather_code=2,
            sunrise=time(4, 43),
            sunset=time(18, 59),
            uv_index=7,
        )
        self.aqi = AQIData(
            aqi=73,
            level=AQILevel.GOOD,
            pm25=20.3,
            pm10=21.0,
            is_model_estimate=True,
            trend="下降",
        )
        now = datetime(2026, 8, 4, tzinfo=timezone.utc)
        self.template = PersonalTemplate(
            template_id="golden",
            name="定稿验收",
            created_at=now,
            updated_at=now,
            custom_sections={
                "tasks": [
                    {"title": "晨报版式核对", "status": "done"},
                    {"title": "工作流生产验收", "status": "doing"},
                ],
                "disciples": [
                    {"displayName": "賈南風", "state": "available", "focus": "枢务调度"},
                    {"displayName": "蕭觀音", "state": "busy", "focus": "生活事务"},
                ],
                "schedule": [
                    {"time": "09:30", "title": "检查重点任务进度"},
                    {"time": "14:00", "title": "复核待验收成果"},
                    {"time": "20:30", "title": "整理次日安排"},
                ],
            },
        )

    def render(self) -> str:
        return run_pipeline(
            target_date=self.day,
            weather_result=DataSourceResult(source="fixture", data=self.weather),
            aqi_result=DataSourceResult(source="fixture", data=self.aqi),
            lunar_result=LunarSource().fetch(self.day),
            template=self.template,
        ).composed.text

    def test_lunar_regression_august_four_is_sixth_month_day_twenty_two(self):
        lunar = LunarSource().calculate(self.day)
        self.assertEqual((lunar.lunar_month, lunar.lunar_day), (6, 22))
        self.assertEqual((lunar.lunar_month_name, lunar.lunar_day_name), ("六月", "廿二"))

    def test_full_ornate_contract(self):
        text = self.render()
        lines = text.splitlines()
        self.assertEqual(lines[:3], [TOP_ORNAMENT, TITLE_LINE, TOP_ORNAMENT])
        self.assertIn("📜 少主亲启", text)
        self.assertIn("📅 2026年8月4日 星期二 · 农历丙午年六月廿二", text)
        self.assertIn("今日炎热，午后或有阵雨；要事宜早办，闲情可稍留。", text)
        self.assertEqual(text.count("╭─ "), 7)
        self.assertEqual(text.count(SEPARATOR), 7)
        headings = [
            "☀️ 天候司 · 今日云笺",
            "🪷 清气监 · 空气质量",
            "👘 衣行令 · 穿衣出行",
            "🏯 宗门脉象 · 今日运行",
            "🟢 门人名录 · 在线 2 / 2",
            "📌 今日玉牒 · 要事三则",
            "🧧 今日小签",
        ]
        positions = [text.index(value) for value in headings]
        self.assertEqual(positions, sorted(positions))
        self.assertIn(CLOSING_WISH, text)
        self.assertNotIn(LEGACY_FLAT_TITLE, text)
        self.assertNotIn("[待确认]", text)
        self.assertIn("🌖 亏凸月", text)
        self.assertLessEqual(len(text), 4096)

    def test_missing_operational_facts_are_not_invented(self):
        text = run_pipeline(
            target_date=self.day,
            weather_result=DataSourceResult(source="fixture", data=self.weather),
            aqi_result=DataSourceResult(source="fixture", data=self.aqi),
            lunar_result=LunarSource().fetch(self.day),
        ).composed.text
        self.assertIn("今日尚无已核实的任务回报", text)
        self.assertIn("门人状态尚在核对，不作猜测", text)
        self.assertNotIn("已完成任务 · 8 项", text)
        self.assertNotIn("在线 5 / 8", text)

    def test_legacy_flat_message_is_rejected(self):
        old = (
            f"{LEGACY_FLAT_TITLE}\n{SEPARATOR}\n今日小签\n农历 六月廿一\n"
            f"{SEPARATOR}\n天候司\n气温 34°C"
        )
        brief = create_final_brief(old, "life", "12345", "2026-08-04")
        errors = final_gate_check(brief, TOP_ORNAMENT)
        self.assertTrue(any("不一致" in error for error in errors))

    def test_preview_notice_is_first_and_never_hidden_in_body(self):
        text = offline_preview(self.day, "life", "REQUIRED_NUMERIC_TELEGRAM_CHAT_ID")
        self.assertTrue(text.startswith("说明：这是不外发的离线验收预览"))
        self.assertIn(TOP_ORNAMENT, text)


if __name__ == "__main__":
    unittest.main()

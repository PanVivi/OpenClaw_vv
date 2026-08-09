from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from hehuan_daily.models import AQIData, AQILevel, DataSourceResult, WeatherData
from hehuan_daily.owner_profile import load_owner_template
from hehuan_daily.pipeline import run_pipeline
from hehuan_daily.lunar import LunarSource


class MorningInputsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.owner_root = Path(self.temp.name)
        self.profile_path = self.owner_root / "morning-brief-owner-profile.json"
        self.inputs_path = self.owner_root / "morning-brief-inputs.json"
        self.profile_path.write_text(json.dumps({
            "shift_rotation": {
                "anchor_date": "2026-08-10",
                "cycle_days": 1,
                "shift_start_cycle": ["rest"],
            },
            "shift_schedules": {},
        }), encoding="utf-8")
        self.profile_path.chmod(0o600)

    def tearDown(self):
        self.temp.cleanup()

    def write_inputs(self, **updates):
        state = {
            "schema": "hehuan.morning-brief-inputs",
            "schemaVersion": 1,
            "revision": 7,
            "updatedAt": "2026-08-09T03:00:00.000Z",
            "preferences": {
                "header": {"salutation": "少主亲启", "temporary_wish": "愿今日考试从容顺利"},
                "attire": {"heat_sensitive": True},
            },
            "events": [{
                "id": "event-exam",
                "title": "技能考试",
                "eventAt": "2026-08-10T01:15:00.000Z",
                "location": "考场",
                "status": "confirmed",
                "recurrence": "none",
                "reminder": {"status": "scheduled", "minutesBefore": 60, "nextRunAt": "2026-08-10T00:15:00.000Z"},
                "source": {"kind": "direct_life", "sourceAt": "2026-08-09T02:00:00.000Z"},
                "dedupeKey": "exam",
                "createdAt": "2026-08-09T02:00:00.000Z",
                "updatedAt": "2026-08-09T02:00:00.000Z",
            }],
            "tasks": [{
                "id": "task-docs", "title": "准备考试证件", "status": "todo",
                "dueDate": "2026-08-10", "note": "提前放进包里",
                "source": {"kind": "housekeeper_handoff", "sourceAt": "2026-08-09T02:30:00.000Z"},
                "dedupeKey": "docs", "createdAt": "2026-08-09T02:30:00.000Z", "updatedAt": "2026-08-09T02:30:00.000Z",
            }],
            "notes": [
                {"id": f"note-{module}", "module": module, "content": f"{module} 已确认补记", "startDate": "2026-08-10", "endDate": "2026-08-10", "status": "active", "source": {"kind": "direct_life", "sourceAt": "2026-08-09T02:00:00.000Z"}, "dedupeKey": f"note-{module}", "createdAt": "2026-08-09T02:00:00.000Z", "updatedAt": "2026-08-09T02:00:00.000Z"}
                for module in ("header", "weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar")
            ],
            "locationOverrides": [{
                "id": "location-test", "name": "测试地点", "latitude": 25.0, "longitude": 121.5,
                "startDate": "2026-08-10", "endDate": "2026-08-10", "status": "active",
                "source": {"kind": "direct_life", "sourceAt": "2026-08-09T02:00:00.000Z"},
                "dedupeKey": "location", "createdAt": "2026-08-09T02:00:00.000Z", "updatedAt": "2026-08-09T02:00:00.000Z",
            }],
        }
        state.update(updates)
        self.inputs_path.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
        self.inputs_path.chmod(0o600)

    def load(self):
        return load_owner_template(
            self.profile_path,
            date(2026, 8, 10),
            timezone_name="Asia/Taipei",
            latitude=1.0,
            longitude=2.0,
            owner_root=self.owner_root,
            morning_inputs_path=self.inputs_path,
        )

    def test_all_dynamic_inputs_project_to_correct_day(self):
        self.write_inputs()
        template = self.load()
        self.assertEqual(template.latitude, 25.0)
        self.assertEqual(template.longitude, 121.5)
        self.assertEqual(template.custom_sections["input_revision"], 7)
        self.assertEqual(template.custom_sections["schedule"][0]["title"], "技能考试")
        self.assertEqual(template.custom_sections["schedule"][0]["time"], "09:15")
        self.assertEqual(template.custom_sections["schedule"][0]["reminderMinutes"], 60)
        self.assertEqual(template.custom_sections["tasks"][0]["title"], "准备考试证件")
        self.assertEqual(len(template.custom_sections["module_notes"]), 8)
        self.assertTrue(template.custom_sections["preferences"]["attire"]["heat_sensitive"])

    def test_pipeline_keeps_seven_boxes_and_places_notes(self):
        self.write_inputs()
        template = self.load()
        weather = WeatherData(temperature_c=34, daily_min_temp=26, daily_max_temp=35, daily_max_precip_probability=60)
        aqi = AQIData(aqi=65, level=AQILevel.GOOD, pm25=16, pm10=16)
        result = run_pipeline(
            target_date=date(2026, 8, 10),
            weather_result=DataSourceResult(source="fixture", data=weather),
            aqi_result=DataSourceResult(source="fixture", data=aqi),
            lunar_result=LunarSource().fetch(date(2026, 8, 10)),
            template=template,
        )
        text = result.composed.text
        self.assertEqual(text.count("╭─"), 7)
        for module in ("weather", "aqi", "attire", "tasks", "disciples", "schedule", "folk_calendar"):
            self.assertIn(f"{module} 已确认补记", text)
        self.assertIn("09:15　技能考试", text)
        self.assertIn("较怕热", text)
        self.assertIn("愿今日考试从容顺利", text)

    def test_corrupt_dynamic_input_degrades_without_losing_base_brief(self):
        self.inputs_path.write_text("{not-json", encoding="utf-8")
        self.inputs_path.chmod(0o600)
        template = self.load()
        self.assertTrue(template.custom_sections["input_degraded"])
        self.assertEqual(template.custom_sections["schedule"], [])
        self.assertIn("暂时无法核清", template.custom_sections["module_notes"]["schedule"][0])

    def test_cancelled_and_other_day_records_are_filtered(self):
        self.write_inputs()
        raw = json.loads(self.inputs_path.read_text(encoding="utf-8"))
        raw["events"][0]["status"] = "cancelled"
        raw["tasks"][0]["dueDate"] = "2026-08-11"
        raw["notes"][0]["status"] = "archived"
        self.inputs_path.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
        self.inputs_path.chmod(0o600)
        template = self.load()
        self.assertEqual(template.custom_sections["schedule"], [])
        self.assertEqual(template.custom_sections["tasks"], [])
        self.assertNotIn("header", template.custom_sections["module_notes"])

    def test_multiple_active_locations_fail_closed(self):
        self.write_inputs()
        raw = json.loads(self.inputs_path.read_text(encoding="utf-8"))
        duplicate = dict(raw["locationOverrides"][0])
        duplicate["id"] = "location-second"
        duplicate["dedupeKey"] = "location-second"
        raw["locationOverrides"].append(duplicate)
        self.inputs_path.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
        self.inputs_path.chmod(0o600)
        template = self.load()
        self.assertTrue(template.custom_sections["input_degraded"])
        self.assertEqual(template.latitude, 1.0)
        self.assertEqual(template.longitude, 2.0)


if __name__ == "__main__":
    unittest.main()

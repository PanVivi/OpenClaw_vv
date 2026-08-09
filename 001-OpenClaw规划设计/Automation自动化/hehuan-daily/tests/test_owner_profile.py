"""业主专属资料的最小只读装配验收。"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from hehuan_daily.owner_profile import OwnerProfileError, load_owner_template
from hehuan_daily.pipeline import run_pipeline


class TestOwnerProfile(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "Vivi"
        self.root.mkdir()
        self.profile = self.root / "morning-brief-owner-profile.json"
        self.profile.write_text(
            json.dumps({
                "identity": {"gender": "private"},
                "birth": {"gregorian_date": "private"},
                "shift_rotation": {
                    "anchor_date": "2026-08-04",
                    "cycle_days": 3,
                    "shift_start_cycle": ["day", None, "third"],
                },
                "shift_schedules": {
                    "day": {
                        "alarm": "06:30",
                        "leave_home_approx": "07:20",
                        "clock_in_before": "08:00",
                    },
                    "second": {
                        "leave_home_approx": "13:30",
                        "clock_in_before": "14:00",
                    },
                    "third": {
                        "leave_home_approx": "21:30",
                        "handover_next_day": "08:00",
                    },
                },
            }, ensure_ascii=False),
            encoding="utf-8",
        )

    def tearDown(self):
        self.temp.cleanup()

    def load(self, day: date):
        return load_owner_template(
            self.profile,
            day,
            timezone_name="Asia/Shanghai",
            latitude=41.28861,
            longitude=123.765,
            owner_root=self.root,
        )

    def test_only_schedule_is_projected(self):
        template = self.load(date(2026, 8, 4))
        self.assertEqual(
            set(template.custom_sections),
            {"schedule", "tasks", "disciples", "module_notes", "preferences"},
        )
        rendered = json.dumps(template.custom_sections, ensure_ascii=False)
        self.assertNotIn("gender", rendered)
        self.assertNotIn("gregorian", rendered)
        self.assertIn("白班·准备出门", rendered)

    def test_rest_day_has_no_invented_schedule(self):
        template = self.load(date(2026, 8, 5))
        self.assertEqual(template.custom_sections["schedule"], [])

    def test_cycle_wraps_deterministically(self):
        template = self.load(date(2026, 8, 7))
        self.assertIn("白班", json.dumps(template.custom_sections, ensure_ascii=False))

    def test_profile_outside_owner_root_is_rejected(self):
        outside = Path(self.temp.name) / "outside.json"
        outside.write_text("{}", encoding="utf-8")
        with self.assertRaises(OwnerProfileError):
            load_owner_template(
                outside,
                date(2026, 8, 4),
                timezone_name="Asia/Shanghai",
                latitude=0,
                longitude=0,
                owner_root=self.root,
            )

    def test_unknown_shift_fails_closed(self):
        raw = json.loads(self.profile.read_text(encoding="utf-8"))
        raw["shift_rotation"]["shift_start_cycle"][0] = "unknown"
        self.profile.write_text(json.dumps(raw), encoding="utf-8")
        with self.assertRaises(OwnerProfileError):
            self.load(date(2026, 8, 4))

    def test_production_chinese_rotation_tokens_map_explicitly(self):
        raw = json.loads(self.profile.read_text(encoding="utf-8"))
        raw["shift_rotation"]["shift_start_cycle"] = ["白1", "二1", "休1"]
        self.profile.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
        self.assertIn("白班", json.dumps(self.load(date(2026, 8, 4)).custom_sections, ensure_ascii=False))
        self.assertIn("二班", json.dumps(self.load(date(2026, 8, 5)).custom_sections, ensure_ascii=False))
        self.assertEqual(self.load(date(2026, 8, 6)).custom_sections["schedule"], [])

    def test_owner_event_is_not_hidden_by_five_shift_milestones(self):
        raw = json.loads(self.profile.read_text(encoding="utf-8"))
        raw["shift_schedules"]["day"].update({
            "handover": "15:30",
            "clock_out_approx": "15:50",
        })
        self.profile.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
        inputs = self.root / "morning-brief-inputs.json"
        inputs.write_text(json.dumps({
            "schema": "hehuan.morning-brief-inputs",
            "schemaVersion": 1,
            "revision": 1,
            "updatedAt": "2026-08-09T00:00:00Z",
            "preferences": {},
            "events": [{
                "id": "event-owner",
                "title": "九点一刻复核晨报",
                "eventAt": "2026-08-04T09:15:00+08:00",
                "status": "confirmed",
                "recurrence": "none",
                "reminder": {"status": "scheduled", "minutesBefore": 60},
                "source": {"kind": "direct_life"},
            }],
            "tasks": [],
            "notes": [],
            "locationOverrides": [],
        }, ensure_ascii=False), encoding="utf-8")
        template = load_owner_template(
            self.profile,
            date(2026, 8, 4),
            timezone_name="Asia/Shanghai",
            latitude=41.28861,
            longitude=123.765,
            owner_root=self.root,
            morning_inputs_path=inputs,
        )
        self.assertEqual(template.custom_sections["schedule"][0]["title"], "九点一刻复核晨报")
        self.assertIn("九点一刻复核晨报", run_pipeline(
            target_date=date(2026, 8, 4), template=template,
        ).composed.text)


if __name__ == "__main__":
    unittest.main()

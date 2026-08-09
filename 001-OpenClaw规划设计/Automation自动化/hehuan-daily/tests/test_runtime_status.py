from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from hehuan_daily.runtime_status import record_run


class RuntimeStatusTest(unittest.TestCase):
    def test_run_fact_preserves_deployment_state(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "runtime-status.json"
            path.write_text(json.dumps({
                "schema": "hehuan.morning-brief-runtime",
                "schemaVersion": 1,
                "declarationKey": "hehuan-daily-v1",
                "enabled": False,
                "schedule": "0 6 * * *",
                "timezone": "Asia/Taipei",
                "disabledReason": "等待视觉和控制链验收",
            }), encoding="utf-8")
            record_run(
                path,
                brief_date="2026-08-10",
                success=True,
                status="sent",
                message_id="321",
            )
            state = json.loads(path.read_text(encoding="utf-8"))
            self.assertFalse(state["enabled"])
            self.assertEqual(state["disabledReason"], "等待视觉和控制链验收")
            self.assertEqual(state["lastBriefDate"], "2026-08-10")
            self.assertEqual(state["lastRunStatus"], "sent")
            self.assertEqual(state["lastMessageId"], "321")
            self.assertIn("lastRunAt", state)


if __name__ == "__main__":
    unittest.main()

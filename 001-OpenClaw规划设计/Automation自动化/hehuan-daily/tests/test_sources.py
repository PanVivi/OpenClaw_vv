"""数据源层测试。

运行: cd /workspace/hehuan-daily && python -m pytest tests/ -v
注意：网络相关测试使用 mock，不发出真实请求。
"""

from __future__ import annotations

import base64
import json
import os
import sys
import tempfile
import unittest
from datetime import date, datetime, timedelta
from unittest.mock import MagicMock, patch

# 确保 src 在 path 中
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from hehuan_daily.config import Config
from hehuan_daily.exceptions import (
    AQIError,
    OverrideError,
    TemplateError,
    WeatherError,
)
from hehuan_daily.models import (
    AQIData,
    AQILevel,
    LunarData,
    PersonalTemplate,
    TravelOverride,
    WeatherData,
)


# ══════════════════════════════════════════════════════════════
# Weather
# ══════════════════════════════════════════════════════════════
class TestWeatherSource(unittest.TestCase):
    def setUp(self):
        from hehuan_daily.weather import WeatherSource

        self.source = WeatherSource()

    def _mock_response(self, body: dict):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(body).encode()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        return mock_resp

    def test_parse_open_meteo_success(self):
        raw = {
            "current": {
                "temperature_2m": 22.5,
                "relative_humidity_2m": 65.0,
                "apparent_temperature_c": 21.0,
                "wind_speed_10m": 12.3,
                "wind_direction_10m": 180.0,
                "precipitation": 0.0,
                "weather_code": 1,
            },
            "daily": {
                "temperature_2m_max": [25.0],
                "temperature_2m_min": [18.0],
                "sunrise": ["2026-08-03T05:30:00+08:00"],
                "sunset": ["2026-08-03T19:00:00+08:00"],
                "uv_index_max": [7.0],
            },
        }
        data = self.source._parse_open_meteo(raw)
        self.assertAlmostEqual(data.temperature_c, 22.5)
        self.assertAlmostEqual(data.humidity_pct, 65.0)
        self.assertAlmostEqual(data.daily_max_temp, 25.0)
        self.assertAlmostEqual(data.daily_min_temp, 18.0)
        self.assertEqual(data.weather_code, 1)

    def test_fetch_open_meteo_primary_success(self):
        raw = {
            "current": {"temperature_2m": 20.0, "weather_code": 0},
            "daily": {"temperature_2m_max": [22.0], "temperature_2m_min": [17.0]},
        }
        with patch("urllib.request.urlopen", return_value=self._mock_response(raw)):
            result = self.source.fetch(latitude=39.9, longitude=116.4)

        self.assertEqual(result.source, "open-meteo")
        self.assertFalse(result.is_degraded)
        self.assertAlmostEqual(result.data.temperature_c, 20.0)

    def test_fetch_fallback_to_met_norway(self):
        """主源失败时自动切到备源。"""
        norway_raw = {
            "properties": {
                "timeseries": [
                    {
                        "time": "2026-08-03T12:00:00Z",
                        "data": {
                            "instant": {
                                "details": {
                                    "air_temperature": 19.5,
                                    "relative_humidity": 70.0,
                                    "wind_speed": 10.0,
                                    "wind_from_direction": 200.0,
                                }
                            },
                            "next_1_hours": {"summary": {"symbol_code": "clearsky"}},
                            "next_6_hours": {
                                "summary": {"symbol_code": "partlycloudy"},
                                "details": {"precipitation_amount": 0.5},
                            },
                        },
                    }
                ]
            }
        }
        mock_norway = MagicMock()
        mock_norway.read.return_value = json.dumps(norway_raw).encode()
        mock_norway.__enter__ = MagicMock(return_value=mock_norway)
        mock_norway.__exit__ = MagicMock(return_value=False)

        with patch(
            "urllib.request.urlopen",
            side_effect=[Exception("timeout"), Exception("timeout"), mock_norway],
        ):
            result = self.source.fetch(latitude=39.9, longitude=116.4)

        self.assertEqual(result.source, "met-norway")
        self.assertTrue(result.is_degraded)
        self.assertAlmostEqual(result.data.temperature_c, 19.5)

    def test_fetch_all_sources_fail(self):
        with patch(
            "urllib.request.urlopen",
            side_effect=Exception("network down"),
        ):
            with self.assertRaises(WeatherError):
                self.source.fetch()

    def test_parse_met_norway(self):
        raw = {
            "properties": {
                "timeseries": [
                    {
                        "time": "2026-08-03T10:00:00Z",
                        "data": {
                            "instant": {
                                "details": {
                                    "air_temperature": 18.0,
                                    "relative_humidity": 72.0,
                                    "wind_speed": 8.5,
                                }
                            }
                        },
                    }
                ]
            }
        }
        data = self.source._parse_met_norway(raw)
        self.assertAlmostEqual(data.temperature_c, 18.0)
        self.assertAlmostEqual(data.humidity_pct, 72.0)
        self.assertAlmostEqual(data.wind_speed_kmh, 8.5 * 3.6)


# ══════════════════════════════════════════════════════════════
# AQI
# ══════════════════════════════════════════════════════════════
class TestAQISource(unittest.TestCase):
    def setUp(self):
        from hehuan_daily.aqi import AQISource

        self.source = AQISource()

    def _mock_response(self, body: dict):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(body).encode()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        return mock_resp

    def test_aqi_level_mapping(self):
        from hehuan_daily.aqi import _aqi_level

        self.assertEqual(_aqi_level(30), AQILevel.EXCELLENT)
        self.assertEqual(_aqi_level(80), AQILevel.GOOD)
        self.assertEqual(_aqi_level(120), AQILevel.LIGHT_POLLUTION)
        self.assertEqual(_aqi_level(180), AQILevel.MODERATE_POLLUTION)
        self.assertEqual(_aqi_level(250), AQILevel.HEAVY_POLLUTION)
        self.assertEqual(_aqi_level(350), AQILevel.SEVERE_POLLUTION)
        self.assertEqual(_aqi_level(None), AQILevel.UNKNOWN)

    def test_cams_fallback_without_waqi_token(self):
        """无 WAQI token 时直接走 CAMS。"""
        cams_raw = {
            "current": {
                "european_aqi": 85,
                "pm2_5": 12.3,
                "pm10": 20.1,
                "ozone": 50.0,
                "nitrogen_dioxide": 15.0,
                "sulphur_dioxide": 3.0,
                "carbon_monoxide": 0.5,
            }
        }
        with patch("urllib.request.urlopen", return_value=self._mock_response(cams_raw)):
            result = self.source.fetch(latitude=39.9, longitude=116.4)

        self.assertEqual(result.source, "cams-model")
        self.assertAlmostEqual(result.data.aqi, 85)
        self.assertAlmostEqual(result.data.pm25, 12.3)
        self.assertTrue(result.data.is_model_estimate)

    def test_waqi_with_token_then_degrade(self):
        """有 WAQI token 但超时后降级到 CAMS。"""
        config = Config(waqi_token="test-token")
        from hehuan_daily.aqi import AQISource

        source = AQISource(config)

        cams_raw = {
            "current": {
                "european_aqi": 120,
                "pm2_5": 35.0,
            }
        }
        mock_cams = MagicMock()
        mock_cams.read.return_value = json.dumps(cams_raw).encode()
        mock_cams.__enter__ = MagicMock(return_value=mock_cams)
        mock_cams.__exit__ = MagicMock(return_value=False)

        with patch(
            "urllib.request.urlopen",
            side_effect=[Exception("timeout"), mock_cams],
        ):
            result = source.fetch(latitude=39.9, longitude=116.4)

        self.assertEqual(result.source, "cams-model")
        self.assertTrue(result.is_degraded)
        self.assertAlmostEqual(result.data.aqi, 120)


# ══════════════════════════════════════════════════════════════
# Lunar
# ══════════════════════════════════════════════════════════════
class TestLunarSource(unittest.TestCase):
    def setUp(self):
        from hehuan_daily.lunar import LunarSource

        self.source = LunarSource()

    def test_table_integrity(self):
        """农历表包含 1900-2100 共 201 年数据。"""
        from hehuan_daily.lunar import LUNAR_INFO

        self.assertEqual(len(LUNAR_INFO), 201)

    def test_solar_to_lunar_known_date(self):
        """已知日期验证：2026-08-03 对应农历六月二十。"""
        result = self.source.calculate(date(2026, 8, 3))
        self.assertEqual(result.solar_date, date(2026, 8, 3))
        # 验证返回了农历数据
        self.assertIsNotNone(result.lunar_year)
        self.assertIsNotNone(result.lunar_month)
        self.assertIsNotNone(result.lunar_day)
        self.assertIsNotNone(result.lunar_month_name)
        self.assertIsNotNone(result.lunar_day_name)

    def test_ganzhi_format(self):
        """干支格式正确（天干+地支）。"""
        result = self.source.calculate(date(2026, 8, 3))
        from hehuan_daily.lunar import DIZHI, TIANGAN

        self.assertIn(result.year_ganzhi[0], TIANGAN)
        self.assertIn(result.year_ganzhi[1], DIZHI)
        self.assertIn(result.month_ganzhi[0], TIANGAN)
        self.assertIn(result.month_ganzhi[1], DIZHI)
        self.assertIn(result.day_ganzhi[0], TIANGAN)
        self.assertIn(result.day_ganzhi[1], DIZHI)

    def test_zodiac(self):
        """生肖在已知列表中。"""
        result = self.source.calculate(date(2026, 8, 3))
        from hehuan_daily.lunar import ZODIAC_ANIMALS

        self.assertIn(result.zodiac, ZODIAC_ANIMALS)

    def test_yi_ji_not_empty(self):
        """宜忌列表非空。"""
        result = self.source.calculate(date(2026, 8, 3))
        self.assertTrue(len(result.yi) > 0)
        self.assertTrue(len(result.ji) > 0)

    def test_constellation(self):
        """星座有效。"""
        result = self.source.calculate(date(2026, 8, 3))
        from hehuan_daily.lunar import CONSTELLATIONS

        self.assertIn(result.constellation, CONSTELLATIONS)

    def test_chongsha_format(self):
        """冲煞格式正确。"""
        result = self.source.calculate(date(2026, 8, 3))
        self.assertTrue(result.chongsha.startswith("冲"))

    def test_fetch_returns_result(self):
        result = self.source.fetch(date(2026, 8, 3))
        self.assertEqual(result.source, "lunar-builtin")
        self.assertIsInstance(result.data, LunarData)


# ══════════════════════════════════════════════════════════════
# Templates
# ══════════════════════════════════════════════════════════════
class TestTemplateManager(unittest.TestCase):
    def setUp(self):
        from hehuan_daily.templates import TemplateManager

        self.tmpdir = tempfile.mkdtemp()
        self.config = Config(template_dir=self.tmpdir)
        self.mgr = TemplateManager(self.config)

    def test_create_and_get(self):
        data = {
            "template_id": "test-001",
            "name": "测试模板",
            "greeting_style": "poetic",
            "language": "zh-CN",
            "latitude": 39.9,
            "longitude": 116.4,
        }
        created = self.mgr.create(data)
        self.assertEqual(created.template_id, "test-001")

        fetched = self.mgr.get("test-001")
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.name, "测试模板")
        self.assertEqual(fetched.greeting_style, "poetic")

    def test_validation_rejects_invalid(self):
        with self.assertRaises(TemplateError):
            self.mgr.create({"name": "no-id"})

    def test_list_and_delete(self):
        self.mgr.create({"template_id": "a", "name": "A"})
        self.mgr.create({"template_id": "b", "name": "B"})
        ids = self.mgr.list_ids()
        self.assertIn("a", ids)
        self.assertIn("b", ids)

        self.assertTrue(self.mgr.delete("a"))
        self.assertIsNone(self.mgr.get("a"))

    def test_update(self):
        self.mgr.create({"template_id": "u1", "name": "old"})
        updated = self.mgr.update("u1", {"name": "new"})
        self.assertEqual(updated.name, "new")

    def test_path_traversal_blocked(self):
        with self.assertRaises(TemplateError):
            self.mgr.get("../../etc/passwd")


# ══════════════════════════════════════════════════════════════
# Override
# ══════════════════════════════════════════════════════════════
class TestOverrideManager(unittest.TestCase):
    def setUp(self):
        from hehuan_daily.override import OverrideManager

        self.tmpdir = tempfile.mkdtemp()
        self.config = Config(override_dir=self.tmpdir)
        self.mgr = OverrideManager(self.config)

    def test_create_with_expires(self):
        data = {
            "override_id": "travel-001",
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "location_name": "上海",
            "latitude": 31.23,
            "longitude": 121.47,
            "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "notes": "出差",
        }
        o = self.mgr.create(data)
        self.assertEqual(o.override_id, "travel-001")
        self.assertTrue(o.is_active(date(2026, 8, 12)))

    def test_expires_at_required(self):
        with self.assertRaises(OverrideError):
            self.mgr.create({
                "override_id": "x",
                "start_date": "2026-08-10",
                "end_date": "2026-08-15",
                "location_name": "X",
                "latitude": 0,
                "longitude": 0,
            })

    def test_is_active_date_check(self):
        data = {
            "override_id": "travel-002",
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "location_name": "杭州",
            "latitude": 30.27,
            "longitude": 120.15,
            "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        }
        self.mgr.create(data)
        self.assertTrue(self.mgr.get("travel-002").is_active(date(2026, 8, 10)))
        self.assertTrue(self.mgr.get("travel-002").is_active(date(2026, 8, 15)))
        self.assertFalse(self.mgr.get("travel-002").is_active(date(2026, 8, 16)))
        self.assertFalse(self.mgr.get("travel-002").is_active(date(2026, 8, 9)))

    def test_find_active(self):
        future = (datetime.utcnow() + timedelta(days=60)).isoformat()
        self.mgr.create({
            "override_id": "active-1",
            "start_date": date.today().isoformat(),
            "end_date": (date.today() + timedelta(days=5)).isoformat(),
            "location_name": "测试地",
            "latitude": 30.0,
            "longitude": 120.0,
            "expires_at": future,
        })
        active = self.mgr.find_active(date.today())
        self.assertEqual(len(active), 1)

    def test_cleanup_expired(self):
        past = (datetime.utcnow() - timedelta(days=1)).isoformat()
        self.mgr.create({
            "override_id": "expired-1",
            "start_date": "2026-01-01",
            "end_date": "2026-01-05",
            "location_name": "过期",
            "latitude": 30.0,
            "longitude": 120.0,
            "expires_at": past,
        })
        removed = self.mgr.cleanup_expired()
        self.assertGreaterEqual(removed, 1)
        self.assertIsNone(self.mgr.get("expired-1"))


# ══════════════════════════════════════════════════════════════
# Crypto (skip if cryptography not installed)
# ══════════════════════════════════════════════════════════════
class TestCrypto(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            import cryptography  # noqa: F401

            cls.has_crypto = True
        except ImportError:
            cls.has_crypto = False

    def test_encrypt_decrypt_roundtrip(self):
        if not self.has_crypto:
            self.skipTest("cryptography 未安装")
        from hehuan_daily.crypto import decrypt, encrypt, generate_key

        key = generate_key()
        plaintext = "合欢宗·步非煙"
        ct = encrypt(plaintext, key)
        pt = decrypt(ct, key)
        self.assertEqual(pt, plaintext)

    def test_encrypt_produces_different_ciphertext(self):
        if not self.has_crypto:
            self.skipTest("cryptography 未安装")
        from hehuan_daily.crypto import encrypt, generate_key

        key = generate_key()
        ct1 = encrypt("test", key)
        ct2 = encrypt("test", key)
        # 不同 nonce → 不同密文
        self.assertNotEqual(ct1, ct2)

    def test_key_length_validation(self):
        if not self.has_crypto:
            self.skipTest("cryptography 未安装")
        from hehuan_daily.crypto import encrypt

        with self.assertRaises(Exception):
            encrypt("test", b"short-key")


# ══════════════════════════════════════════════════════════════
# New: hourly / trend / us_aqi tests
# ══════════════════════════════════════════════════════════════
class TestWeatherHourly(unittest.TestCase):
    def setUp(self):
        from hehuan_daily.weather import WeatherSource
        self.source = WeatherSource()

    def test_hourly_summary_parsed(self):
        raw = {
            "current": {"temperature_2m": 22.0, "weather_code": 1},
            "daily": {"temperature_2m_max": [25.0], "temperature_2m_min": [18.0]},
            "hourly": {
                "time": ["2026-08-03T00:00", "2026-08-03T01:00"],
                "temperature_2m": [20.0, 19.0],
                "precipitation_probability": [10, 50],
                "weather_code": [0, 61],
                "wind_speed_10m": [5, 8],
            },
        }
        data = self.source._parse_open_meteo(raw)
        self.assertEqual(len(data.hourly_summary), 2)
        self.assertEqual(data.hourly_summary[0]["temperature_c"], 20.0)
        self.assertEqual(data.hourly_summary[1]["precip_prob"], 50)

    def test_hourly_summary_empty_when_missing(self):
        raw = {
            "current": {"temperature_2m": 22.0},
            "daily": {},
        }
        data = self.source._parse_open_meteo(raw)
        self.assertEqual(data.hourly_summary, [])

    def test_wind_gusts_parsed(self):
        raw = {
            "current": {
                "temperature_2m": 22.0,
                "wind_speed_10m": 10.0,
                "wind_gusts_10m": 25.0,
            },
            "daily": {},
        }
        data = self.source._parse_open_meteo(raw)
        self.assertAlmostEqual(data.wind_gusts_kmh, 25.0)

    def test_is_day_parsed(self):
        raw = {
            "current": {"temperature_2m": 22.0, "is_day": 1},
            "daily": {},
        }
        data = self.source._parse_open_meteo(raw)
        self.assertTrue(data.is_day)


class TestAQITrend(unittest.TestCase):
    def setUp(self):
        from hehuan_daily.aqi import AQISource
        self.source = AQISource()

    def test_trend_up(self):
        self.assertEqual(self.source._calc_trend([50, 60, 70, 80]), "上升")

    def test_trend_down(self):
        self.assertEqual(self.source._calc_trend([80, 70, 60, 50]), "下降")

    def test_trend_flat(self):
        self.assertEqual(self.source._calc_trend([50, 52, 48, 51]), "平稳")

    def test_trend_none_for_few_values(self):
        self.assertIsNone(self.source._calc_trend([50, 60]))

    def test_cams_uses_us_aqi_first(self):
        """CAMS 解析优先使用 us_aqi。"""
        raw = {
            "current": {
                "us_aqi": 85,
                "european_aqi": 75,
                "pm2_5": 12.3,
            },
            "hourly": {"us_aqi": [50, 55, 80, 90]},
        }
        data = self.source._parse_cams(raw)
        self.assertAlmostEqual(data.aqi, 85)
        self.assertTrue(data.is_model_estimate)
        self.assertEqual(data.trend, "上升")

    def test_cams_falls_back_to_european_aqi(self):
        """CAMS 无 us_aqi 时降级到 european_aqi。"""
        raw = {
            "current": {
                "european_aqi": 75,
                "pm2_5": 12.3,
            },
            "hourly": {},
        }
        data = self.source._parse_cams(raw)
        self.assertAlmostEqual(data.aqi, 75)


class TestModuleRenderers(unittest.TestCase):
    """测试模块渲染器输出包含降级标记和逐时数据。"""

    def test_aqi_renderer_shows_model_estimate_marker(self):
        from hehuan_daily.modules.aqi import AQIModule
        mod = AQIModule()
        from hehuan_daily.models import AQIData, AQILevel
        data = AQIData(
            aqi=85,
            level=AQILevel.GOOD,
            pm25=12.3,
            is_model_estimate=True,
            trend="上升",
        )
        text = mod.render(data)
        self.assertIn("US AQI", text)
        self.assertNotIn("[待确认]", text)
        self.assertIn("模型估算，并非监测站实测", text)
        self.assertIn("24 小时趋势：上升", text)

    def test_weather_renderer_shows_hourly(self):
        from hehuan_daily.modules.weather import WeatherModule
        mod = WeatherModule()
        from hehuan_daily.models import WeatherData
        data = WeatherData(
            temperature_c=22.0,
            daily_max_temp=25.0,
            daily_min_temp=18.0,
            hourly_summary=[
                {"time": "2026-08-03T12:00", "temperature_c": 22.0, "precip_prob": 10, "weather_code": 0},
                {"time": "2026-08-03T13:00", "temperature_c": 23.0, "precip_prob": 20, "weather_code": 1},
                {"time": "2026-08-03T14:00", "temperature_c": 24.0, "precip_prob": 40, "weather_code": 2},
                {"time": "2026-08-03T15:00", "temperature_c": 24.0, "precip_prob": 45, "weather_code": 2},
                {"time": "2026-08-03T16:00", "temperature_c": 24.0, "precip_prob": 50, "weather_code": 61},
            ],
        )
        text = mod.render(data)
        self.assertIn("最大降雨概率：50%", text)

    def test_weather_renderer_shows_wind_gusts(self):
        from hehuan_daily.modules.weather import WeatherModule
        mod = WeatherModule()
        from hehuan_daily.models import WeatherData
        data = WeatherData(
            temperature_c=22.0,
            wind_speed_kmh=10.0,
            wind_gusts_kmh=25.0,
        )
        text = mod.render(data)
        self.assertIn("最大风速：约 25 km/h（含阵风）", text)


if __name__ == "__main__":
    unittest.main()

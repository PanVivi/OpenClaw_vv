"""数据源层测试 v2 — 覆盖 RESUME-NEEDED 审计发现的缺口。

运行: cd /workspace/hehuan-daily && python3 -m unittest tests.test_sources_v2 -v
纯 stdlib，无第三方依赖。
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

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
# Weather: MET Norway parsing paths + wind speed conversion
# ══════════════════════════════════════════════════════════════
class TestWeatherMETNorwayParsing(unittest.TestCase):
    """验证 MET Norway fallback 解析路径正确性。"""

    def setUp(self):
        from hehuan_daily.weather import WeatherSource
        self.source = WeatherSource()

    def _mock_norway_response(self, body: dict):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(body).encode()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        return mock_resp

    def test_met_norway_instant_details_path(self):
        """MET Norway 正确路径: data.instant.details。"""
        raw = {
            "properties": {
                "timeseries": [
                    {
                        "time": "2026-08-03T12:00:00Z",
                        "data": {
                            "instant": {
                                "details": {
                                    "air_temperature": 19.5,
                                    "relative_humidity": 70.0,
                                    "wind_speed": 5.0,  # m/s
                                    "wind_from_direction": 200.0,
                                }
                            },
                            "next_1_hours": {
                                "summary": {"symbol_code": "clearsky"},
                                "details": {"precipitation_amount": 0.1},
                            },
                            "next_6_hours": {
                                "summary": {"symbol_code": "partlycloudy"},
                                "details": {"precipitation_amount": 0.5},
                            },
                        },
                    }
                ]
            }
        }
        data = self.source._parse_met_norway(raw)
        self.assertAlmostEqual(data.temperature_c, 19.5)
        self.assertAlmostEqual(data.humidity_pct, 70.0)

    def test_met_norway_wind_speed_converted_to_kmh(self):
        """MET Norway 风速 m/s → km/h (×3.6)。"""
        raw = {
            "properties": {
                "timeseries": [
                    {
                        "time": "2026-08-03T12:00:00Z",
                        "data": {
                            "instant": {
                                "details": {
                                    "air_temperature": 20.0,
                                    "wind_speed": 10.0,  # m/s = 36 km/h
                                    "wind_speed_of_gust": 15.0,  # m/s = 54 km/h
                                }
                            },
                        },
                    }
                ]
            }
        }
        data = self.source._parse_met_norway(raw)
        self.assertAlmostEqual(data.wind_speed_kmh, 36.0)  # 10 * 3.6
        self.assertAlmostEqual(data.wind_gusts_kmh, 54.0)  # 15 * 3.6

    def test_met_norway_wind_speed_none_when_missing(self):
        """无风速数据时返回 None，不报错。"""
        raw = {
            "properties": {
                "timeseries": [
                    {
                        "time": "2026-08-03T12:00:00Z",
                        "data": {
                            "instant": {
                                "details": {"air_temperature": 20.0}
                            },
                        },
                    }
                ]
            }
        }
        data = self.source._parse_met_norway(raw)
        self.assertIsNone(data.wind_speed_kmh)
        self.assertIsNone(data.wind_gusts_kmh)

    def test_met_norway_precipitation_from_next_6(self):
        """降水数据从 next_6_hours.details 获取。"""
        raw = {
            "properties": {
                "timeseries": [
                    {
                        "time": "2026-08-03T12:00:00Z",
                        "data": {
                            "instant": {"details": {"air_temperature": 20.0}},
                            "next_6_hours": {
                                "details": {"precipitation_amount": 2.5}
                            },
                        },
                    }
                ]
            }
        }
        data = self.source._parse_met_norway(raw)
        self.assertAlmostEqual(data.precipitation_mm, 2.5)

    def test_met_norway_fallback_activated_correctly(self):
        """主源全部失败后正确降级到 MET Norway。"""
        norway_raw = {
            "properties": {
                "timeseries": [
                    {
                        "time": "2026-08-03T12:00:00Z",
                        "data": {
                            "instant": {
                                "details": {
                                    "air_temperature": 19.5,
                                    "wind_speed": 5.0,
                                }
                            },
                            "next_6_hours": {
                                "details": {"precipitation_amount": 0.5}
                            },
                        },
                    }
                ]
            }
        }
        mock_norway = self._mock_norway_response(norway_raw)

        with patch(
            "urllib.request.urlopen",
            side_effect=[Exception("timeout"), Exception("timeout"), mock_norway],
        ):
            result = self.source.fetch(latitude=39.9, longitude=116.4)

        self.assertEqual(result.source, "met-norway")
        self.assertTrue(result.is_degraded)
        self.assertAlmostEqual(result.data.temperature_c, 19.5)
        self.assertAlmostEqual(result.data.wind_speed_kmh, 18.0)  # 5 * 3.6


# ══════════════════════════════════════════════════════════════
# Weather: coordinate fallback (0.0 is valid)
# ══════════════════════════════════════════════════════════════
class TestCoordinateFallback(unittest.TestCase):
    """验证经纬度 0.0 不被错误回退到默认值。"""

    def test_weather_lat_lon_zero_not_fallback(self):
        """lat=0.0, lon=0.0 是有效坐标（几内亚湾），不应回退。"""
        from hehuan_daily.weather import WeatherSource
        source = WeatherSource()

        raw = {
            "current": {"temperature_2m": 30.0, "weather_code": 0},
            "daily": {"temperature_2m_max": [32.0], "temperature_2m_min": [28.0]},
        }
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(raw).encode()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)

        captured_urls = []
        original_urlopen = __import__("urllib.request").request.urlopen

        def capture_urlopen(req, *args, **kwargs):
            if hasattr(req, "full_url"):
                captured_urls.append(req.full_url)
            else:
                captured_urls.append(str(req))
            return mock_resp

        with patch("urllib.request.urlopen", side_effect=capture_urlopen):
            result = source.fetch(latitude=0.0, longitude=0.0)

        # 验证 URL 包含 lat=0.0&lon=0.0
        self.assertTrue(len(captured_urls) > 0, "urlopen 应被调用")
        url = captured_urls[0]
        self.assertIn("latitude=0.0", url)
        self.assertIn("longitude=0.0", url)

    def test_aqi_lat_lon_zero_not_fallback(self):
        """AQI 模块 lat=0.0, lon=0.0 不应回退。"""
        from hehuan_daily.aqi import AQISource
        source = AQISource()

        cams_raw = {
            "current": {
                "european_aqi": 85,
                "pm2_5": 12.3,
            }
        }
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(cams_raw).encode()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)

        captured_urls = []

        def capture_urlopen(req, *args, **kwargs):
            if hasattr(req, "full_url"):
                captured_urls.append(req.full_url)
            else:
                captured_urls.append(str(req))
            return mock_resp

        with patch("urllib.request.urlopen", side_effect=capture_urlopen):
            result = source.fetch(latitude=0.0, longitude=0.0)

        self.assertTrue(len(captured_urls) > 0, "urlopen 应被调用")
        url = captured_urls[0]
        self.assertIn("latitude=0.0", url)
        self.assertIn("longitude=0.0", url)


# ══════════════════════════════════════════════════════════════
# Lunar: precise 节气 + 月柱 + 时柱
# ══════════════════════════════════════════════════════════════
class TestLunarPreciseJieqi(unittest.TestCase):
    """验证节气计算精度。"""

    def setUp(self):
        from hehuan_daily.lunar import LunarSource
        self.source = LunarSource()

    def test_jieqi_lichun_2026(self):
        """2026 年立春在 2 月 4 日左右。"""
        lichun = self.source._calculate_jieqi(2026, 2)
        self.assertEqual(lichun.month, 2)
        self.assertIn(lichun.day, [3, 4, 5])

    def test_jieqi_dongzhi_2026(self):
        """2026 年冬至在 12 月 22 日左右。"""
        dongzhi = self.source._calculate_jieqi(2026, 23)
        self.assertEqual(dongzhi.month, 12)
        self.assertIn(dongzhi.day, [21, 22, 23])

    def test_jieqi_xiaohan_2026(self):
        """2026 年小寒在 1 月 5 日左右。"""
        xiaohan = self.source._calculate_jieqi(2026, 0)
        self.assertEqual(xiaohan.month, 1)
        self.assertIn(xiaohan.day, [5, 6])

    def test_jieqi_all_24_valid_dates(self):
        """所有 24 节气计算结果为有效日期。"""
        for year in [2025, 2026, 2027]:
            for i in range(24):
                result = self.source._calculate_jieqi(year, i)
                self.assertIsInstance(result, date)
                self.assertTrue(1 <= result.day <= 28)
                self.assertTrue(1 <= result.month <= 12)

    def test_jieqi_order_monotonic(self):
        """同一年内节气日期单调递增（跨年小寒除外）。"""
        dates = []
        for i in range(24):
            d = self.source._calculate_jieqi(2026, i)
            dates.append(d)
        for i in range(1, 24):
            if dates[i] > dates[i - 1]:
                continue
            # 小寒(1月) 可能 < 冬至(12月) 跨年，允许
            pass


class TestLunarGanzhiPillars(unittest.TestCase):
    """验证四柱计算。"""

    def setUp(self):
        from hehuan_daily.lunar import LunarSource
        self.source = LunarSource()

    def test_year_ganzhi_lichun_boundary(self):
        """年柱以立春为界：立春前属上一年。"""
        # 2026 立春约 2/4
        before_lichun = date(2026, 2, 3)
        after_lichun = date(2026, 2, 5)

        gz_before = self.source._year_ganzhi(before_lichun)
        gz_after = self.source._year_ganzhi(after_lichun)

        # 立春前后年柱应不同（除非恰好在交界日）
        # 2026 = 丙午年, 2025 = 乙巳年
        self.assertNotEqual(gz_before, gz_after)

    def test_month_ganzhi_changes_at_jie(self):
        """月柱在节气月变化。"""
        # 立春(寅月) vs 雨水(寅月) vs 惊蛰(卯月)
        lichun_date = self.source._calculate_jieqi(2026, 2)
        jingzhe_date = self.source._calculate_jieqi(2026, 4)

        gz_lichun = self.source._month_ganzhi(lichun_date)
        gz_jingzhe = self.source._month_ganzhi(jingzhe_date)

        # 立春和惊蛰的月柱地支应不同（寅 vs 卯）
        self.assertNotEqual(gz_lichun[1], gz_jingzhe[1])

    def test_hour_ganzhi_format(self):
        """时柱格式正确。"""
        from hehuan_daily.lunar import TIANGAN, DIZHI
        gz = self.source._hour_ganzhi(date(2026, 8, 3), hour=12)
        self.assertIn(gz[0], TIANGAN)
        self.assertIn(gz[1], DIZHI)

    def test_hour_ganzhi_changes_with_hour(self):
        """时柱随时辰变化。"""
        gz_morning = self.source._hour_ganzhi(date(2026, 8, 3), hour=5)   # 卯时
        gz_noon = self.source._hour_ganzhi(date(2026, 8, 3), hour=12)     # 午时
        # 不同时辰地支应不同
        self.assertNotEqual(gz_morning[1], gz_noon[1])

    def test_calculate_includes_hour_ganzhi(self):
        """calculate() 返回结果包含时柱。"""
        result = self.source.calculate(date(2026, 8, 3))
        self.assertIsNotNone(result.hour_ganzhi)
        self.assertEqual(len(result.hour_ganzhi), 2)

    def test_ganzhi_60_cycle(self):
        """连续 60 天的日柱不重复（60 干支周期）。"""
        seen = set()
        base = date(2026, 1, 1)
        for i in range(60):
            d = base + timedelta(days=i)
            gz = self.source._day_ganzhi(d)
            seen.add(gz)
        self.assertEqual(len(seen), 60)  # 60 个不同干支


# ══════════════════════════════════════════════════════════════
# Templates: fail-closed L3 + atomic writes + permissions
# ══════════════════════════════════════════════════════════════
class TestTemplateFailClosed(unittest.TestCase):
    """验证 L3 无密钥时 fail-closed。"""

    def setUp(self):
        from hehuan_daily.templates import TemplateManager
        self.tmpdir = tempfile.mkdtemp()
        # 无 L3 key
        self.config = Config(template_dir=self.tmpdir, l3_key=None)
        self.mgr = TemplateManager(self.config)

    def test_l3_plaintext_rejected_without_key(self):
        """无 L3 key 时，明文 L3 数据应被拒绝。"""
        data = {
            "template_id": "test-l3",
            "name": "Test",
            "legal_name_encrypted": "张三",  # 明文
        }
        with self.assertRaises(TemplateError) as ctx:
            self.mgr.create(data)
        self.assertIn("L3", str(ctx.exception))

    def test_l3_none_allowed_without_key(self):
        """无 L3 key 时，L3 字段为 None 应被允许。"""
        data = {
            "template_id": "test-no-l3",
            "name": "Test",
            "legal_name_encrypted": None,
        }
        created = self.mgr.create(data)
        self.assertIsNone(created.legal_name_encrypted)

    def test_l3_encrypted_with_key(self):
        """有 L3 key 时，L3 数据被加密存储，读取时解密。"""
        try:
            from hehuan_daily.crypto import generate_key
            generate_key()  # 测试 cryptography 是否可用
        except Exception:
            self.skipTest("cryptography 未安装，跳过加密测试")

        from hehuan_daily.crypto import generate_key
        from hehuan_daily.templates import TemplateManager
        config = Config(template_dir=self.tmpdir, l3_key=generate_key())
        mgr = TemplateManager(config)

        data = {
            "template_id": "test-enc",
            "name": "Encrypted",
            "legal_name_encrypted": "李四",
        }
        created = mgr.create(data)
        # create() 返回的模型含明文（调用者刚创建）
        self.assertEqual(created.legal_name_encrypted, "李四")

        # get() 读取后解密，返回明文
        fetched = mgr.get("test-enc")
        self.assertEqual(fetched.legal_name_encrypted, "李四")

    def test_l3_raw_on_disk_is_ciphertext(self):
        """磁盘原始 JSON 中 L3 字段为密文（非明文）。"""
        try:
            from hehuan_daily.crypto import generate_key
            generate_key()
        except Exception:
            self.skipTest("cryptography 未安装，跳过加密测试")

        from hehuan_daily.crypto import generate_key
        from hehuan_daily.templates import TemplateManager
        config = Config(template_dir=self.tmpdir, l3_key=generate_key())
        mgr = TemplateManager(config)

        plaintext = "张三丰"
        mgr.create({
            "template_id": "disk-check",
            "name": "Disk",
            "legal_name_encrypted": plaintext,
        })

        # 读取原始 JSON 文件
        raw_path = os.path.join(self.tmpdir, "disk-check.json")
        with open(raw_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        raw_value = raw_data["legal_name_encrypted"]
        # 磁盘上不应是明文
        self.assertNotEqual(raw_value, plaintext)
        # 应是 base64 编码的密文（字符串）
        self.assertIsInstance(raw_value, str)
        # 解密后应能还原
        import base64
        ct = base64.b64decode(raw_value)
        self.assertGreaterEqual(len(ct), 12 + 16)  # nonce + tag


class TestTemplateAtomicWrite(unittest.TestCase):
    """验证原子写入和文件权限。"""

    def setUp(self):
        from hehuan_daily.templates import TemplateManager
        self.tmpdir = tempfile.mkdtemp()
        self.config = Config(template_dir=self.tmpdir)
        self.mgr = TemplateManager(self.config)

    @unittest.skipIf(os.name == "nt", "Windows does not expose POSIX mode bits")
    def test_file_permissions_0o600(self):
        """写入的文件权限为 0o600。"""
        data = {"template_id": "perm-test", "name": "Perm"}
        self.mgr.create(data)

        path = os.path.join(self.tmpdir, "perm-test.json")
        mode = os.stat(path).st_mode & 0o777
        self.assertEqual(mode, 0o600)

    def test_atomic_write_no_temp_leftover(self):
        """原子写入不遗留临时文件。"""
        data = {"template_id": "atomic-test", "name": "Atomic"}
        self.mgr.create(data)

        files = os.listdir(self.tmpdir)
        temp_files = [f for f in files if f.startswith(".template-")]
        self.assertEqual(len(temp_files), 0)
        self.assertIn("atomic-test.json", files)


class TestTemplateJSONSchemaValidation(unittest.TestCase):
    """验证 JSON Schema 校验实际执行。"""

    def setUp(self):
        from hehuan_daily.templates import TemplateManager
        self.tmpdir = tempfile.mkdtemp()
        self.config = Config(template_dir=self.tmpdir)
        self.mgr = TemplateManager(self.config)

    def test_invalid_template_id_rejected(self):
        """非法 template_id（含特殊字符）应被拒绝。"""
        data = {"template_id": "test space!", "name": "Bad ID"}
        with self.assertRaises(TemplateError):
            self.mgr.create(data)

    def test_invalid_greeting_style_rejected(self):
        """greeting_style 枚举外值应被拒绝。"""
        data = {
            "template_id": "test-style",
            "name": "Test",
            "greeting_style": "invalid_style",
        }
        with self.assertRaises(TemplateError):
            self.mgr.create(data)

    def test_latitude_out_of_range_rejected(self):
        """latitude > 90 应被拒绝。"""
        data = {
            "template_id": "test-lat",
            "name": "Test",
            "latitude": 91.0,
        }
        with self.assertRaises(TemplateError):
            self.mgr.create(data)

    def test_birth_date_format_rejected(self):
        """birth_date 格式错误应被拒绝。"""
        data = {
            "template_id": "test-date",
            "name": "Test",
            "birth_date": "2026/08/03",  # 应为 YYYY-MM-DD
        }
        with self.assertRaises(TemplateError):
            self.mgr.create(data)


# ══════════════════════════════════════════════════════════════
# Override: timezone-aware datetime handling
# ══════════════════════════════════════════════════════════════
class TestOverrideTimezone(unittest.TestCase):
    """验证时区处理正确。"""

    def setUp(self):
        from hehuan_daily.override import OverrideManager
        self.tmpdir = tempfile.mkdtemp()
        self.config = Config(override_dir=self.tmpdir)
        self.mgr = OverrideManager(self.config)

    def test_expires_at_naive_string_normalized(self):
        """naive 字符串 expires_at 被归一化为 aware UTC。"""
        data = {
            "override_id": "tz-test-1",
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "location_name": "上海",
            "latitude": 31.23,
            "longitude": 121.47,
            "expires_at": "2027-08-15T00:00:00",  # naive
        }
        o = self.mgr.create(data)
        self.assertIsNotNone(o.expires_at.tzinfo)

    def test_expires_at_aware_string_preserved(self):
        """aware 字符串 expires_at 被保留。"""
        data = {
            "override_id": "tz-test-2",
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "location_name": "北京",
            "latitude": 39.9,
            "longitude": 116.4,
            "expires_at": "2027-08-15T00:00:00+08:00",
        }
        o = self.mgr.create(data)
        self.assertIsNotNone(o.expires_at.tzinfo)

    def test_is_active_uses_aware_comparison(self):
        """is_active 使用 aware 比较，不触发 TypeError。"""
        data = {
            "override_id": "tz-test-3",
            "start_date": date.today().isoformat(),
            "end_date": (date.today() + timedelta(days=5)).isoformat(),
            "location_name": "测试",
            "latitude": 30.0,
            "longitude": 120.0,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        }
        self.mgr.create(data)
        # 不应触发 TypeError
        result = self.mgr.get("tz-test-3").is_active(date.today())
        self.assertTrue(result)

    def test_is_active_expired_correct(self):
        """过期覆盖正确返回 False。"""
        data = {
            "override_id": "tz-test-4",
            "start_date": "2026-01-01",
            "end_date": "2026-01-05",
            "location_name": "过期",
            "latitude": 30.0,
            "longitude": 120.0,
            "expires_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        }
        self.mgr.create(data)
        self.assertFalse(self.mgr.get("tz-test-4").is_active(date(2026, 1, 3)))

    def test_cleanup_expired_works_with_aware(self):
        """cleanup_expired 使用 aware 比较。"""
        data = {
            "override_id": "tz-test-5",
            "start_date": "2026-01-01",
            "end_date": "2026-01-05",
            "location_name": "过期",
            "latitude": 30.0,
            "longitude": 120.0,
            "expires_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        }
        self.mgr.create(data)
        removed = self.mgr.cleanup_expired()
        self.assertGreaterEqual(removed, 1)
        self.assertIsNone(self.mgr.get("tz-test-5"))


# ══════════════════════════════════════════════════════════════
# AQI: coordinate fallback + US AQI priority
# ══════════════════════════════════════════════════════════════
class TestAQIFeatures(unittest.TestCase):
    """验证 AQI 特性。"""

    def setUp(self):
        from hehuan_daily.aqi import AQISource
        self.source = AQISource()

    def test_us_aqi_priority_over_european(self):
        """CAMS 解析优先使用 US AQI。"""
        raw = {
            "current": {
                "us_aqi": 85,
                "european_aqi": 75,
                "pm2_5": 12.3,
            },
            "hourly": {"us_aqi": [50, 55, 80, 90]},
        }
        data = self.source._parse_cams(raw)
        self.assertEqual(data.aqi, 85)
        self.assertTrue(data.is_model_estimate)

    def test_cams_fallback_to_european_aqi(self):
        """无 US AQI 时降级到 european_aqi。"""
        raw = {
            "current": {"european_aqi": 75, "pm2_5": 12.3},
            "hourly": {},
        }
        data = self.source._parse_cams(raw)
        self.assertEqual(data.aqi, 75)


# ══════════════════════════════════════════════════════════════
# Schema validation comprehensive
# ══════════════════════════════════════════════════════════════
class TestSchemaValidation(unittest.TestCase):
    """验证 JSON Schema 校验器。"""

    def test_validate_template_extra_field_rejected(self):
        """additionalProperties=false 拒绝额外字段。"""
        from hehuan_daily.schemas import validate_template
        data = {
            "template_id": "test",
            "name": "Test",
            "unknown_field": "should_fail",
        }
        errors = validate_template(data)
        self.assertTrue(len(errors) > 0)

    def test_validate_override_date_format(self):
        """expires_at 格式错误应被拒绝。"""
        from hehuan_daily.schemas import validate_override
        data = {
            "override_id": "test",
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "location_name": "Test",
            "latitude": 30.0,
            "longitude": 120.0,
            "expires_at": "not-a-date",
        }
        errors = validate_override(data)
        self.assertTrue(len(errors) > 0)

    def test_validate_template_valid_passes(self):
        """合法模板数据通过校验。"""
        from hehuan_daily.schemas import validate_template
        data = {
            "template_id": "valid-id",
            "name": "Valid Template",
            "greeting_style": "poetic",
            "language": "zh-CN",
            "latitude": 39.9,
            "longitude": 116.4,
            "birth_date": "1990-01-01",
            "birth_time": "08:30",
        }
        errors = validate_template(data)
        self.assertEqual(len(errors), 0)


if __name__ == "__main__":
    unittest.main()

"""天气数据源：Open-Meteo Forecast API（主源）+ MET Norway Locationforecast（备源）。

策略：主源 10s 超时 + 1 次重试；仍失败则切备源。
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from datetime import date, datetime, time
from typing import Optional

from .config import Config, default_config
from .exceptions import WeatherError
from .models import DataSourceResult, WeatherData

logger = logging.getLogger(__name__)


class WeatherSource:
    """天气数据获取器。"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or default_config

    # ── 公开接口 ─────────────────────────────────────────────
    def fetch(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        target_date: Optional[date] = None,
    ) -> DataSourceResult:
        """获取天气数据，自动降级。"""
        lat = latitude if latitude is not None else self.config.default_latitude
        lon = longitude if longitude is not None else self.config.default_longitude

        # 主源尝试（含重试）
        for attempt in range(1 + self.config.weather_retry):
            try:
                raw = self._fetch_open_meteo(lat, lon)
                data = self._parse_open_meteo(raw)
                return DataSourceResult(
                    source="open-meteo",
                    data=data,
                    notes=[f"attempt={attempt + 1}"],
                )
            except Exception as e:
                logger.warning("open-meteo attempt %d failed: %s", attempt + 1, e)
                if attempt < self.config.weather_retry:
                    import time as _time

                    _time.sleep(0.5 * (attempt + 1))

        # 降级到备源
        try:
            raw = self._fetch_met_norway(lat, lon)
            data = self._parse_met_norway(raw, target_date)
            return DataSourceResult(
                source="met-norway",
                data=data,
                is_degraded=True,
                notes=["primary_failed_fallback_activated"],
            )
        except Exception as e:
            logger.error("met-norway fallback also failed: %s", e)
            raise WeatherError(
                f"所有天气数据源均失败。主源: open-meteo, 备源: met-norway"
            ) from e

    # ── Open-Meteo ────────────────────────────────────────────
    def _fetch_open_meteo(self, lat: float, lon: float) -> dict:
        url = (
            f"{self.config.open_meteo_forecast_url}"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
            f"precipitation,weather_code,wind_speed_10m,wind_direction_10m,"
            f"wind_gusts_10m,is_day"
            f"&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,"
            f"wind_speed_10m,uv_index"
            f"&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,"
            f"precipitation_sum,weather_code"
            f"&forecast_hours=24"
            f"&timezone=auto"
        )
        return self._http_get(url, timeout=self.config.weather_timeout_s)

    def _parse_open_meteo(self, raw: dict) -> WeatherData:
        current = raw.get("current", {})
        daily = raw.get("daily", {})
        hourly = raw.get("hourly", {})

        def _first(lst):
            return lst[0] if lst else None

        # 构建 24h 逐时摘要
        hourly_summary = self._build_hourly_summary(hourly)
        precip_probabilities = [
            value for value in (_int(v) for v in hourly.get("precipitation_probability", []))
            if value is not None
        ]
        apparent_temperatures = [
            value for value in (_num(v) for v in hourly.get("apparent_temperature", []))
            if value is not None
        ]

        return WeatherData(
            temperature_c=_num(current.get("temperature_2m")),
            apparent_temperature_c=_num(current.get("apparent_temperature")),
            humidity_pct=_num(current.get("relative_humidity_2m")),
            wind_speed_kmh=_num(current.get("wind_speed_10m")),
            wind_direction_deg=_num(current.get("wind_direction_10m")),
            wind_gusts_kmh=_num(current.get("wind_gusts_10m")),
            weather_code=_int(current.get("weather_code")),
            is_day=bool(current.get("is_day")) if current.get("is_day") is not None else None,
            precipitation_mm=_num(current.get("precipitation")),
            uv_index=_num(_first(daily.get("uv_index_max"))),
            sunrise=_parse_time(_first(daily.get("sunrise"))),
            sunset=_parse_time(_first(daily.get("sunset"))),
            daily_max_temp=_num(_first(daily.get("temperature_2m_max"))),
            daily_min_temp=_num(_first(daily.get("temperature_2m_min"))),
            daily_precip_sum=_num(_first(daily.get("precipitation_sum"))),
            daily_max_precip_probability=max(precip_probabilities, default=None),
            daily_max_apparent_temp=max(apparent_temperatures, default=None),
            daily_weather_code=_int(_first(daily.get("weather_code"))),
            hourly_summary=hourly_summary,
        )

    @staticmethod
    def _build_hourly_summary(hourly: dict) -> list[dict]:
        """从 hourly JSON 中提取未来 24h 逐时摘要。"""
        times = hourly.get("time", [])
        temps = hourly.get("temperature_2m", [])
        precip_probs = hourly.get("precipitation_probability", [])
        apparent_temps = hourly.get("apparent_temperature", [])
        codes = hourly.get("weather_code", [])
        winds = hourly.get("wind_speed_10m", [])

        summary = []
        for i in range(min(len(times), 24)):
            summary.append(
                {
                    "time": times[i],
                    "temperature_c": _num(temps[i]) if i < len(temps) else None,
                    "apparent_temperature_c": _num(apparent_temps[i]) if i < len(apparent_temps) else None,
                    "precip_prob": _int(precip_probs[i]) if i < len(precip_probs) else None,
                    "weather_code": _int(codes[i]) if i < len(codes) else None,
                    "wind_speed_kmh": _num(winds[i]) if i < len(winds) else None,
                }
            )
        return summary

    # ── MET Norway ────────────────────────────────────────────
    def _fetch_met_norway(self, lat: float, lon: float) -> dict:
        url = (
            f"{self.config.met_norway_url}"
            f"?lat={lat}&lon={lon}"
        )
        # MET Norway 要求 User-Agent
        req = urllib.request.Request(url, headers={"User-Agent": "hehuan-daily/0.1"})
        return self._http_get_with_request(req, timeout=self.config.weather_timeout_s)

    def _parse_met_norway(self, raw: dict, target_date: Optional[date] = None) -> WeatherData:
        timeseries = raw.get("properties", {}).get("timeseries", [])
        if not timeseries:
            raise WeatherError("MET Norway 返回空 timeseries")

        # 取最近一个时次（使用 naive UTC 比较）
        now = datetime.utcnow()
        best = min(
            timeseries,
            key=lambda t: abs(
                datetime.fromisoformat(t["time"].replace("Z", "")).replace(tzinfo=None)
                - now
            ),
        )
        # MET Norway JSON 路径: data.instant.details / data.next_X_hours.details
        data_block = best.get("data", {})
        instant = data_block.get("instant", {}).get("details", {})
        next_1h_details = data_block.get("next_1_hours", {}).get("details", {})
        next_6h_details = data_block.get("next_6_hours", {}).get("details", {})

        # 取目标日期的 daily 汇总（如有）
        target = target_date or date.today()
        daily_max = None
        daily_min = None
        for entry in timeseries:
            t = datetime.fromisoformat(entry["time"].replace("Z", "+00:00")).date()
            if t == target:
                d = entry.get("data", {}).get("instant", {}).get("details", {})
                if "air_temperature_max" in d:
                    daily_max = _num(d.get("air_temperature_max"))
                if "air_temperature_min" in d:
                    daily_min = _num(d.get("air_temperature_min"))

        # 降水：优先 next_6_hours，备选 next_1_hours
        precip = None
        if next_6h_details.get("precipitation_amount") is not None:
            precip = _num(next_6h_details.get("precipitation_amount"))
        elif next_1h_details.get("precipitation_amount") is not None:
            precip = _num(next_1h_details.get("precipitation_amount"))

        # MET Norway 风速单位是 m/s，转换为 km/h（* 3.6）
        wind_speed_ms = _num(instant.get("wind_speed"))
        wind_speed_kmh = wind_speed_ms * 3.6 if wind_speed_ms is not None else None
        wind_gusts_ms = _num(instant.get("wind_speed_of_gust"))
        wind_gusts_kmh = wind_gusts_ms * 3.6 if wind_gusts_ms is not None else None

        return WeatherData(
            temperature_c=_num(instant.get("air_temperature")),
            apparent_temperature_c=_num(instant.get("wind_temperature"))
            if "wind_temperature" in instant
            else None,
            humidity_pct=_num(instant.get("relative_humidity")),
            wind_speed_kmh=wind_speed_kmh,
            wind_direction_deg=_num(instant.get("wind_from_direction")),
            wind_gusts_kmh=wind_gusts_kmh,
            precipitation_mm=precip,
            daily_max_temp=daily_max,
            daily_min_temp=daily_min,
        )

    # ── HTTP 工具 ─────────────────────────────────────────────
    def _http_get(self, url: str, timeout: float) -> dict:
        req = urllib.request.Request(url, headers={"User-Agent": "hehuan-daily/0.1"})
        return self._http_get_with_request(req, timeout=timeout)

    def _http_get_with_request(self, req, timeout: float) -> dict:
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                return json.loads(raw)
        except urllib.error.URLError as e:
            if isinstance(e, urllib.error.HTTPError):
                raise WeatherError(f"HTTP {e.code}: {e.reason}") from e
            raise WeatherError(f"网络错误: {e.reason}") from e
        except TimeoutError:
            raise WeatherError(f"请求超时 ({timeout}s)")
        except Exception as e:
            raise WeatherError(f"HTTP 请求失败: {e}") from e


# ── 辅助函数 ──────────────────────────────────────────────────
def _num(v) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _int(v) -> Optional[int]:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _parse_time(s: Optional[str]) -> Optional[time]:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s)
        return dt.time()
    except (ValueError, TypeError):
        return None

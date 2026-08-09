"""AQI 数据源：WAQI 站点观测（需 token，当前无）→ CAMS 模型估算（Open-Meteo Air Quality）。

策略：无 WAQI token 时直接使用 CAMS 模型估算；有 token 时先尝试 WAQI，8s 超时后降级。
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Optional

from .config import Config, default_config
from .exceptions import AQIError
from .models import AQIData, AQILevel, DataSourceResult

logger = logging.getLogger(__name__)


class AQISource:
    """AQI 数据获取器。"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or default_config

    # ── 公开接口 ─────────────────────────────────────────────
    def fetch(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> DataSourceResult:
        """获取 AQI 数据，自动降级。"""
        lat = latitude if latitude is not None else self.config.default_latitude
        lon = longitude if longitude is not None else self.config.default_longitude

        # 有 WAQI token 时先尝试
        if self.config.waqi_token:
            try:
                raw = self._fetch_waqi(lat, lon)
                data = self._parse_waqi(raw)
                return DataSourceResult(source="waqi", data=data)
            except Exception as e:
                logger.warning("WAQI failed, degrading to CAMS: %s", e)

        # 降级到 CAMS 模型估算
        try:
            raw = self._fetch_cams(lat, lon)
            data = self._parse_cams(raw)
            data.is_model_estimate = True
            return DataSourceResult(
                source="cams-model",
                data=data,
                is_degraded=bool(self.config.waqi_token),
                notes=["model_estimate_not_station"],
            )
        except Exception as e:
            logger.error("CAMS fallback failed: %s", e)
            raise AQIError("所有 AQI 数据源均失败") from e

    # ── WAQI ──────────────────────────────────────────────────
    def _fetch_waqi(self, lat: float, lon: float) -> dict:
        url = (
            f"{self.config.waqi_base_url}/geo:{lat};{lon}/"
            f"?token={self.config.waqi_token}"
        )
        return self._http_get(url, timeout=self.config.aqi_degrade_s)

    def _parse_waqi(self, raw: dict) -> AQIData:
        if raw.get("status") != "ok":
            raise AQIError(f"WAQI 返回错误: {raw.get('status')}")
        d = raw.get("data", {})
        aqi = _int(d.get("aqi"))
        iaqi = d.get("iaqi", {})

        return AQIData(
            aqi=aqi,
            level=_aqi_level(aqi),
            pm25=_num(iaqi.get("pm25", {}).get("v")),
            pm10=_num(iaqi.get("pm10", {}).get("v")),
            o3=_num(iaqi.get("o3", {}).get("v")),
            no2=_num(iaqi.get("no2", {}).get("v")),
            so2=_num(iaqi.get("so2", {}).get("v")),
            co=_num(iaqi.get("co", {}).get("v")),
            dominant_pollutant=d.get("dominentpol"),
            is_model_estimate=False,
        )

    # ── CAMS (Open-Meteo Air Quality) ─────────────────────────
    def _fetch_cams(self, lat: float, lon: float) -> dict:
        url = (
            f"{self.config.open_meteo_aq_url}"
            f"?latitude={lat}&longitude={lon}"
            f"&current=pm10,pm2_5,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,"
            f"us_aqi,european_aqi"
            f"&hourly=us_aqi,pm2_5,pm10"
            f"&forecast_hours=24"
            f"&timezone=auto"
        )
        return self._http_get(url, timeout=self.config.aqi_degrade_s)

    def _parse_cams(self, raw: dict) -> AQIData:
        current = raw.get("current", {})
        # 优先使用 US AQI（符合中国大陆晨报展示习惯）
        aqi = _int(current.get("us_aqi"))
        if aqi is None:
            aqi = _int(current.get("european_aqi"))

        # 解析 24h 趋势
        hourly = raw.get("hourly", {})
        hourly_aqi = [_int(v) for v in hourly.get("us_aqi", []) if v is not None]
        hourly_aqi = [v for v in hourly_aqi if v is not None]
        trend = self._calc_trend(hourly_aqi)

        return AQIData(
            aqi=aqi,
            level=_aqi_level(aqi),
            pm25=_num(current.get("pm2_5")),
            pm10=_num(current.get("pm10")),
            o3=_num(current.get("ozone")),
            no2=_num(current.get("nitrogen_dioxide")),
            so2=_num(current.get("sulphur_dioxide")),
            co=_num(current.get("carbon_monoxide")),
            is_model_estimate=True,
            hourly_aqi=hourly_aqi,
            trend=trend,
        )

    @staticmethod
    def _calc_trend(values: list[int]) -> Optional[str]:
        """计算 AQI 24h 趋势：上升/平稳/下降。"""
        if len(values) < 4:
            return None
        first_half = sum(values[: len(values) // 2]) / (len(values) // 2)
        second_half = sum(values[len(values) // 2 :]) / (
            len(values) - len(values) // 2
        )
        diff = second_half - first_half
        if diff > 10:
            return "上升"
        if diff < -10:
            return "下降"
        return "平稳"

    # ── HTTP 工具 ─────────────────────────────────────────────
    def _http_get(self, url: str, timeout: float) -> dict:
        req = urllib.request.Request(url, headers={"User-Agent": "hehuan-daily/0.1"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            raise AQIError(f"HTTP {e.code}: {e.reason}") from e
        except urllib.error.URLError as e:
            raise AQIError(f"网络错误: {e.reason}") from e
        except TimeoutError:
            raise AQIError(f"请求超时 ({timeout}s)")


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
        return int(float(v))
    except (TypeError, ValueError):
        return None


def _aqi_level(aqi: Optional[int]) -> AQILevel:
    if aqi is None:
        return AQILevel.UNKNOWN
    if aqi <= 50:
        return AQILevel.EXCELLENT
    if aqi <= 100:
        return AQILevel.GOOD
    if aqi <= 150:
        return AQILevel.LIGHT_POLLUTION
    if aqi <= 200:
        return AQILevel.MODERATE_POLLUTION
    if aqi <= 300:
        return AQILevel.HEAVY_POLLUTION
    return AQILevel.SEVERE_POLLUTION

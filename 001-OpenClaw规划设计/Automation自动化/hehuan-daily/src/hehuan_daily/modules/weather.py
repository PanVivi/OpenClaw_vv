"""天气模块。"""

from __future__ import annotations

from typing import Any, Optional

from .base import Module, ModuleContext
from .registry import ModuleId, register


@register(ModuleId.WEATHER)
class WeatherModule(Module):
    """天气模块。"""

    @property
    def module_id(self) -> str:
        return ModuleId.WEATHER.value

    def resolve(self, ctx: ModuleContext) -> bool:
        return ctx.weather is not None

    def collect(self, ctx: ModuleContext) -> Any:
        return ctx.weather

    def render(self, data: Any) -> str:
        code = data.daily_weather_code if data.daily_weather_code is not None else data.weather_code
        desc = _describe_weather_code(code) if code is not None else "天气概况暂缺"
        icon = _weather_icon(code)
        lines = ["╭─ ☀️ 天候司 · 今日云笺", "│", f"│ {icon} {desc}"]
        if data.daily_max_temp is not None and data.daily_min_temp is not None:
            lines.append(f"│ 🌡 气温：{data.daily_min_temp:.0f}～{data.daily_max_temp:.0f}°C")
        elif data.temperature_c is not None:
            lines.append(f"│ 🌡 当前气温：{data.temperature_c:.0f}°C")
        apparent = data.daily_max_apparent_temp
        if apparent is not None:
            lines.append(f"│ 🔥 最高体感：约 {apparent:.0f}°C")
        elif data.apparent_temperature_c is not None:
            lines.append(f"│ 🔥 当前体感：约 {data.apparent_temperature_c:.0f}°C")
        if data.humidity_pct is not None:
            lines.append(f"│ 💧 清晨湿度：约 {data.humidity_pct:.0f}%")
        rain_probabilities = [
            item.get("precip_prob") for item in data.hourly_summary
            if item.get("precip_prob") is not None
        ]
        max_rain_probability = data.daily_max_precip_probability
        if max_rain_probability is None:
            max_rain_probability = max(rain_probabilities, default=None)
        if max_rain_probability is not None:
            lines.append(f"│ 🌧 最大降雨概率：{max_rain_probability}%")
        elif data.daily_precip_sum is not None and data.daily_precip_sum > 0:
            lines.append(f"│ 🌧 预计降水：{data.daily_precip_sum:.1f} mm")
        winds = [
            item.get("wind_speed_kmh") for item in data.hourly_summary
            if item.get("wind_speed_kmh") is not None
        ]
        wind_candidates = [value for value in [*winds, data.wind_speed_kmh, data.wind_gusts_kmh] if value is not None]
        max_wind = max(wind_candidates, default=None)
        if max_wind is not None:
            suffix = "（含阵风）" if data.wind_gusts_kmh is not None and max_wind == data.wind_gusts_kmh else ""
            lines.append(f"│ 🌬 最大风速：约 {max_wind:.0f} km/h{suffix}")
        lines.append("│")
        if data.sunrise is not None:
            lines.append(f"│ 🌅 日出 {data.sunrise.strftime('%H:%M')}")
        if data.sunset is not None:
            lines.append(f"│ 🌇 日落 {data.sunset.strftime('%H:%M')}")
        lines.append("╰─ " + _weather_closing(data))
        return "\n".join(lines)


def _weather_icon(code: int | None) -> str:
    if code is None:
        return "🌤"
    if code == 0:
        return "☀️"
    if code in (1, 2, 3):
        return "🌤"
    if code in (45, 48):
        return "🌫"
    if code in (71, 73, 75, 77, 85, 86):
        return "🌨"
    if code in (95, 96, 99):
        return "⛈"
    return "🌧"


def _weather_closing(data: Any) -> str:
    max_temp = data.daily_max_temp if data.daily_max_temp is not None else data.temperature_c
    rain = data.daily_max_precip_probability or 0
    if max_temp is not None and max_temp >= 35 and rain >= 30:
        return "午后暑热并有降雨可能，外出记得带伞补水"
    if max_temp is not None and max_temp >= 35:
        return "午后暑热明显，外出记得遮阳补水"
    if rain >= 30 or (data.daily_precip_sum or 0) > 0:
        return "今日有雨意，出门把伞带在身边"
    return "天候平稳，照常安排即可"


def _extract_significant_hours(hourly: list[dict]) -> list[str]:
    """从逐时数据中提取关键变化（每 4h 一个点）。"""
    results = []
    for h in hourly[::4]:
        time_str = h.get("time", "")[-5:]  # HH:MM
        temp = h.get("temperature_c")
        prob = h.get("precip_prob")
        code = h.get("weather_code")
        desc = _describe_weather_code(code) if code is not None else ""
        parts = [f"~{temp:.0f}°"] if temp is not None else []
        if prob is not None and prob >= 30:
            parts.append(f"雨概率{prob}%")
        label = " ".join(parts)
        if desc:
            label += f" {desc}"
        if label.strip():
            results.append(f"{time_str}{label}")
    return results[:4]  # 最多 4 个时间点


def _describe_weather_code(code: int) -> str:
    """WMO weather code 描述。"""
    codes = {
        0: "晴",
        1: "大部晴",
        2: "多云",
        3: "阴",
        45: "雾",
        48: "雾凇",
        51: "小毛毛雨",
        53: "毛毛雨",
        55: "大毛毛雨",
        61: "小雨",
        63: "中雨",
        65: "大雨",
        71: "小雪",
        73: "中雪",
        75: "大雪",
        77: "雪粒",
        80: "小阵雨",
        81: "中阵雨",
        82: "大阵雨",
        85: "小阵雪",
        86: "大阵雪",
        95: "雷暴",
        96: "雷暴+小冰雹",
        99: "雷暴+大冰雹",
    }
    return codes.get(code, "")

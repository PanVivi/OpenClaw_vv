"""数据模型。"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Any, Optional


# ── 通用结果包装 ──────────────────────────────────────────────
@dataclass
class DataSourceResult:
    """单个数据源的返回包装。"""

    source: str  # 数据来源标识
    data: Any  # 实际数据
    fetched_at: datetime = field(default_factory=datetime.utcnow)
    is_degraded: bool = False  # 是否来自降级路径
    is_placeholder: bool = False  # 是否虚构/待确认数据
    notes: list[str] = field(default_factory=list)  # 附加说明


# ── 天气 ──────────────────────────────────────────────────────
@dataclass
class WeatherData:
    """天气数据。"""

    temperature_c: Optional[float] = None
    apparent_temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    wind_gusts_kmh: Optional[float] = None
    weather_code: Optional[int] = None  # WMO weather code
    is_day: Optional[bool] = None
    precipitation_mm: Optional[float] = None
    uv_index: Optional[float] = None
    sunrise: Optional[time] = None
    sunset: Optional[time] = None
    daily_max_temp: Optional[float] = None
    daily_min_temp: Optional[float] = None
    daily_precip_sum: Optional[float] = None
    daily_max_precip_probability: Optional[int] = None
    daily_max_apparent_temp: Optional[float] = None
    daily_weather_code: Optional[int] = None
    hourly_summary: list[dict] = field(default_factory=list)
    forecast_summary: Optional[str] = None


# ── AQI ───────────────────────────────────────────────────────
class AQILevel(Enum):
    """AQI 等级。"""

    EXCELLENT = "优"
    GOOD = "良"
    LIGHT_POLLUTION = "轻度污染"
    MODERATE_POLLUTION = "中度污染"
    HEAVY_POLLUTION = "重度污染"
    SEVERE_POLLUTION = "严重污染"
    UNKNOWN = "未知"


@dataclass
class AQIData:
    """空气质量数据。"""

    aqi: Optional[int] = None
    level: AQILevel = AQILevel.UNKNOWN
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    o3: Optional[float] = None
    no2: Optional[float] = None
    so2: Optional[float] = None
    co: Optional[float] = None
    dominant_pollutant: Optional[str] = None
    is_model_estimate: bool = False  # 是否为模型估算（非站点观测）
    # 24h 趋势
    hourly_aqi: list[int] = field(default_factory=list)
    trend: Optional[str] = None  # 上升/平稳/下降


# ── 黄历 / 八字 ──────────────────────────────────────────────
@dataclass
class LunarData:
    """黄历 / 八字数据。"""

    # 公历日期
    solar_date: Optional[date] = None

    # 农历
    lunar_year: Optional[int] = None
    lunar_month: Optional[int] = None
    lunar_day: Optional[int] = None
    lunar_month_name: Optional[str] = None
    lunar_day_name: Optional[str] = None
    is_leap_month: bool = False

    # 干支
    year_ganzhi: Optional[str] = None  # 年柱
    month_ganzhi: Optional[str] = None  # 月柱
    day_ganzhi: Optional[str] = None  # 日柱
    hour_ganzhi: Optional[str] = None  # 时柱（可选）

    # 生肖
    zodiac: Optional[str] = None

    # 节气
    jieqi: Optional[str] = None  # 当日节气（如有）
    next_jieqi: Optional[str] = None  # 下一节气
    next_jieqi_date: Optional[date] = None

    # 宜忌
    yi: list[str] = field(default_factory=list)  # 宜
    ji: list[str] = field(default_factory=list)  # 忌

    # 冲煞
    chongsha: Optional[str] = None
    # 胎神
    taishen: Optional[str] = None
    # 五行
    wuxing: Optional[str] = None

    # 星座
    constellation: Optional[str] = None


# ── 个人模板 ──────────────────────────────────────────────────
@dataclass
class PersonalTemplate:
    """个人模板。"""

    template_id: str
    name: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    # L1: 基础偏好（非敏感）
    greeting_style: Optional[str] = None  # 问候风格
    language: str = "zh-CN"
    timezone: str = "Asia/Taipei"

    # L2: 中等敏感
    location_name: Optional[str] = None  # 显示用地名
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    birth_date: Optional[str] = None  # 公历生日 YYYY-MM-DD
    birth_time: Optional[str] = None  # 出生时间 HH:MM

    # L3: 高敏感 — 独立密钥加密
    legal_name_encrypted: Optional[bytes] = None  # 真实姓名
    id_number_encrypted: Optional[bytes] = None  # 证件号
    phone_encrypted: Optional[bytes] = None  # 手机号
    notes_encrypted: Optional[bytes] = None  # 私人备注

    # 自定义内容
    custom_sections: dict[str, Any] = field(default_factory=dict)


# ── 临时出行覆盖 ──────────────────────────────────────────────
@dataclass
class TravelOverride:
    """临时出行覆盖：按日期/地点覆盖默认配置。"""

    override_id: str
    start_date: date
    end_date: date
    location_name: str
    latitude: float
    longitude: float
    expires_at: datetime  # 强制过期时间
    created_at: datetime = field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

    def is_active(
        self,
        d: Optional[date] = None,
        now_utc: Optional[datetime] = None,
    ) -> bool:
        """检查覆盖在指定日期是否有效（默认今天）。
        
        时区策略: expires_at 为 naive datetime 时假定为 UTC。
        """
        if d is None:
            d = date.today()
        now = now_utc or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return self.start_date <= d <= self.end_date and now < expires

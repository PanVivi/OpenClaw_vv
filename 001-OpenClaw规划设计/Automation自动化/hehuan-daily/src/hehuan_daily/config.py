"""全局配置与常量。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


# ── API endpoints ──────────────────────────────────────────────
OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AIR_QUALITY = "https://air-quality-api.open-meteo.com/v1/air-quality"
MET_NORWAY_FORECAST = "https://api.met.no/weatherapi/locationforecast/2.0/compact"

# WAQI 需要 token，当前未配置；占位供未来接入
WAQI_BASE = "https://api.waqi.info/feed"

# ── 超时与重试 ─────────────────────────────────────────────────
WEATHER_TIMEOUT_S = 10.0  # 主源超时
WEATHER_RETRY = 1  # 主源失败后重试次数
AQI_DEGRADE_S = 8.0  # AQI 超时后降级到 CAMS
DEFAULT_DATA_DIR = "/Volume3/OpenClaw/home/.openclaw/data/hehuan-daily"
DEFAULT_TIMEZONE = "Asia/Taipei"

# ── 加密 ───────────────────────────────────────────────────────
# L3 敏感字段使用独立密钥（通过 env 注入，不落地明文）
ENV_L3_KEY = "HEHUAN_L3_KEY"
ENV_MASTER_KEY = "HEHUAN_MASTER_KEY"

AES_KEY_SIZE = 32  # AES-256
AES_NONCE_SIZE = 12  # GCM 标准 nonce
AES_TAG_SIZE = 16


@dataclass
class Config:
    """运行时配置；生产环境通过依赖注入替换。"""

    # API
    open_meteo_forecast_url: str = OPEN_METEO_FORECAST
    open_meteo_aq_url: str = OPEN_METEO_AIR_QUALITY
    met_norway_url: str = MET_NORWAY_FORECAST
    waqi_base_url: str = WAQI_BASE
    waqi_token: Optional[str] = None

    # 超时
    weather_timeout_s: float = WEATHER_TIMEOUT_S
    weather_retry: int = WEATHER_RETRY
    aqi_degrade_s: float = AQI_DEGRADE_S

    # 发送与业务时区
    send_enabled: bool = False
    failure_notice_enabled: bool = False
    timezone: str = DEFAULT_TIMEZONE

    # 加密
    master_key: Optional[bytes] = None
    l3_key: Optional[bytes] = None

    # 数据目录
    data_dir: str = DEFAULT_DATA_DIR
    template_dir: Optional[str] = None
    override_dir: Optional[str] = None

    # 默认位置（北京）
    default_latitude: float = 39.9042
    default_longitude: float = 116.4074
    location_is_placeholder: bool = True

    def __post_init__(self) -> None:
        self.template_dir = self.template_dir or f"{self.data_dir}/templates"
        self.override_dir = self.override_dir or f"{self.data_dir}/overrides"

    def validate_for_real_send(self, account_id: str, chat_id: str) -> list[str]:
        errors: list[str] = []
        if not account_id or account_id != "life":
            errors.append("真实晨报必须明确使用 life account")
        if not chat_id or not chat_id.lstrip("-").isdigit() or chat_id == "0":
            errors.append("真实晨报必须提供已核实的 Telegram chat id")
        if self.location_is_placeholder:
            errors.append("真实晨报禁止使用占位地点")
        try:
            from zoneinfo import ZoneInfo

            ZoneInfo(self.timezone)
        except Exception:
            errors.append(f"无效时区: {self.timezone}")
        return errors


default_config = Config()

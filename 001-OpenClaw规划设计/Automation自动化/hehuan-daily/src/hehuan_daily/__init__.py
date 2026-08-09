"""合欢宗晨间玉简 — 数据源层 + 调度发送

数据获取模块：天气 / AQI / 黄历八字 / 个人模板 / 临时出行覆盖
调度发送模块：文件锁 / 幂等收据 / 熔断器 / 发送闸门 / 调度器
"""

__version__ = "0.3.0"

from .config import Config, default_config
from .constants import (
    TITLE_PREFIX,
    PRODUCTION_BUDGET,
    HARD_LIMIT,
    HEADER_DISPLAY_CELLS,
    SEPARATOR_DISPLAY_CELLS,
    SEPARATOR,
    DECORATION_POOL,
    MOON_POOL,
    CUSTOM_EMOJI,
    CUSTOM_EMOJI_FORMAT,
    ALLOWED_HTML_TAGS,
)
from .exceptions import (
    DataSourceError,
    WeatherError,
    AQIError,
    LunarError,
    TemplateError,
    OverrideError,
    EncryptionError,
    TimeoutError,
)
from .models import (
    WeatherData,
    AQIData,
    AQILevel,
    LunarData,
    PersonalTemplate,
    TravelOverride,
    DataSourceResult,
)
from .weather import WeatherSource
from .aqi import AQISource
from .lunar import LunarSource
from .templates import TemplateManager
from .override import OverrideManager
from .composer import compose, ComposedBrief, escape_html, sanitize_dynamic
from .pipeline import Pipeline, PipelineContext, PipelineResult, run_pipeline
from .final_brief import FinalBrief, FinalGateError, create_final_brief, final_gate_check
from .modules import (
    ModuleId,
    get_module,
    get_all_modules,
    DEFAULT_MODULE_ORDER,
    MIN_MODULES,
    MAX_MODULES,
    validate_module_order,
)
from .lock import file_lock, LockError
from .idempotency import ReceiptStore, SendReceipt, compute_text_hash
from .circuit_breaker import CircuitBreaker, ESCALATE_CONSECUTIVE_DAYS, STOP_CONSECUTIVE_FAILURES
from .clock import Clock, FrozenClock, SystemClock
from .sender import (
    AmbiguousDeliveryError,
    DefiniteDeliveryError,
    MessageTransport,
    OpenClawCliTransport,
    Sender,
    SendResult,
    SendGateError,
    TransportResult,
)
from .scheduler import Scheduler, ScheduleResult, RootCause, run_once
from .cron_config import CronConfig, MORNING_BRIEF_CRON, get_cron_config, render_cron_yaml

__all__ = [
    # 配置与常量
    "Config",
    "default_config",
    "TITLE_PREFIX",
    "PRODUCTION_BUDGET",
    "HARD_LIMIT",
    "HEADER_DISPLAY_CELLS",
    "SEPARATOR_DISPLAY_CELLS",
    "SEPARATOR",
    "DECORATION_POOL",
    "MOON_POOL",
    "CUSTOM_EMOJI",
    "CUSTOM_EMOJI_FORMAT",
    "ALLOWED_HTML_TAGS",
    # 异常
    "DataSourceError",
    "WeatherError",
    "AQIError",
    "LunarError",
    "TemplateError",
    "OverrideError",
    "EncryptionError",
    "TimeoutError",
    # 数据模型
    "WeatherData",
    "AQIData",
    "AQILevel",
    "LunarData",
    "PersonalTemplate",
    "TravelOverride",
    "DataSourceResult",
    # 数据源
    "WeatherSource",
    "AQISource",
    "LunarSource",
    "TemplateManager",
    "OverrideManager",
    # 排版与流水线
    "compose",
    "ComposedBrief",
    "escape_html",
    "sanitize_dynamic",
    "Pipeline",
    "PipelineContext",
    "PipelineResult",
    "run_pipeline",
    # 发送闸门
    "FinalBrief",
    "FinalGateError",
    "create_final_brief",
    "final_gate_check",
    # 模块注册表
    "ModuleId",
    "get_module",
    "get_all_modules",
    "DEFAULT_MODULE_ORDER",
    "MIN_MODULES",
    "MAX_MODULES",
    "validate_module_order",
    # 调度与发送
    "file_lock",
    "LockError",
    "ReceiptStore",
    "SendReceipt",
    "compute_text_hash",
    "CircuitBreaker",
    "ESCALATE_CONSECUTIVE_DAYS",
    "STOP_CONSECUTIVE_FAILURES",
    "Clock",
    "FrozenClock",
    "SystemClock",
    "AmbiguousDeliveryError",
    "DefiniteDeliveryError",
    "MessageTransport",
    "OpenClawCliTransport",
    "TransportResult",
    "Sender",
    "SendResult",
    "SendGateError",
    "Scheduler",
    "ScheduleResult",
    "RootCause",
    "run_once",
    # Cron 配置
    "CronConfig",
    "MORNING_BRIEF_CRON",
    "get_cron_config",
    "render_cron_yaml",
]

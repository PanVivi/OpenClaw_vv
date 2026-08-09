"""数据源层异常体系。"""

from __future__ import annotations


class DataSourceError(Exception):
    """数据源基础异常。"""


class WeatherError(DataSourceError):
    """天气数据获取失败。"""


class AQIError(DataSourceError):
    """AQI 数据获取失败。"""


class LunarError(DataSourceError):
    """黄历/八字计算失败。"""


class TemplateError(DataSourceError):
    """个人模板操作失败。"""


class OverrideError(DataSourceError):
    """出行覆盖操作失败。"""


class EncryptionError(DataSourceError):
    """加密/解密失败。"""


class TimeoutError(DataSourceError):
    """请求超时。"""

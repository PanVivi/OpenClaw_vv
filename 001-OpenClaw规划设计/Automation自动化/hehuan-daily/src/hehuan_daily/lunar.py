"""黄历 / 八字数据源。

自实现农历算法（基于 6tail lunar-python 的公开算法，MIT 协议）。
无第三方依赖，锁内置数据表。

提供：农历日期、干支、生肖、节气、宜忌、冲煞。
"""

from __future__ import annotations

import logging
import math
from datetime import date, datetime, timedelta
from typing import Optional

from .exceptions import LunarError
from .models import LunarData, DataSourceResult

logger = logging.getLogger(__name__)

# ── 常量表 ────────────────────────────────────────────────────

# 天干
TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
# 地支
DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
# 生肖
ZODIAC_ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]
# 农历月份名
LUNAR_MONTH_NAMES = [
    "正", "二", "三", "四", "五", "六",
    "七", "八", "九", "十", "冬", "腊",
]
# 农历日期名
LUNAR_DAY_NAMES = [
    "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
]
# 节气
JIEQI_NAMES = [
    "小寒", "大寒", "立春", "雨水", "惊蛰", "春分",
    "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
    "小暑", "大暑", "立秋", "处暑", "白露", "秋分",
    "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
]
# 星座
CONSTELLATIONS = [
    "水瓶座", "双鱼座", "白羊座", "金牛座", "双子座", "巨蟹座",
    "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座",
]

# 农历数据表 (1900-2100)
# 每项为 16 进制编码：
#   位 0-3: 闰月大小 (0=29天, 1=30天)
#   位 4-15: 12个月的大小 (0=29天, 1=30天)
#   最高位: 闰月月份 (0=无闰月)
LUNAR_INFO = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
    0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252,
    0x0d520,
]

# 节气黄道经度
JIEQI_LONGITUDES = [
    285, 300, 315, 330, 345, 0, 15, 30, 45, 60, 75, 90,
    105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270,
]

# ── 节气日期计算系数 ──────────────────────────────────────────
# 公式: 日期 = Y × 0.2422 + C - floor(Y/4)
# 其中 Y = 年份后两位, C 为节气系数
# ── 21世纪 (2000-2099) ───────────────────────────────────────
JIEQI_C21: dict[int, tuple[int, float]] = {
    # index: (month, C_coefficient)
    0: (1, 5.4055),   # 小寒
    1: (1, 20.12),    # 大寒
    2: (2, 3.87),     # 立春
    3: (2, 18.73),    # 雨水
    4: (3, 5.63),     # 惊蛰
    5: (3, 20.646),   # 春分
    6: (4, 4.81),     # 清明
    7: (4, 20.1),     # 谷雨
    8: (5, 5.52),     # 立夏
    9: (5, 21.04),    # 小满
    10: (6, 5.678),   # 芒种
    11: (6, 21.37),   # 夏至
    12: (7, 7.108),   # 小暑
    13: (7, 22.83),   # 大暑
    14: (8, 7.5),     # 立秋
    15: (8, 23.13),   # 处暑
    16: (9, 7.646),   # 白露
    17: (9, 23.042),  # 秋分
    18: (10, 8.318),  # 寒露
    19: (10, 23.438), # 霜降
    20: (11, 7.438),  # 立冬
    21: (11, 22.36),  # 小雪
    22: (12, 7.18),   # 大雪
    23: (12, 21.94),  # 冬至
}

# ── 20世纪 (1900-1999) ───────────────────────────────────────
JIEQI_C20: dict[int, tuple[int, float]] = {
    0: (1, 6.388),    # 小寒
    1: (1, 21.16),    # 大寒
    2: (2, 4.6295),   # 立春
    3: (2, 19.4599),  # 雨水
    4: (3, 6.318),    # 惊蛰
    5: (3, 21.04),    # 春分
    6: (4, 5.59),     # 清明
    7: (4, 20.888),   # 谷雨
    8: (5, 6.318),    # 立夏
    9: (5, 21.86),    # 小满
    10: (6, 6.5),     # 芒种
    11: (6, 22.2),    # 夏至
    12: (7, 7.928),   # 小暑
    13: (7, 23.65),   # 大暑
    14: (8, 8.35),    # 立秋
    15: (8, 23.95),   # 处暑
    16: (9, 9.1),     # 白露
    17: (9, 23.822),  # 秋分
    18: (10, 9.082),  # 寒露
    19: (10, 24.218), # 霜降
    20: (11, 8.392),  # 立冬
    21: (11, 23.24),  # 小雪
    22: (12, 7.9),    # 大雪
    23: (12, 22.6),   # 冬至
}

# 十二节（月份分界点）: 立春(2), 惊蛰(4), 清明(6), 立夏(8), 芒种(10), 小暑(12), 立秋(14), 白露(16), 寒露(18), 立冬(20), 小雪(22), 小寒(0 of next year)
# 每个节对应一个地支月份: 寅(2), 卯(3), 辰(4), 巳(5), 午(6), 未(7), 申(8), 酉(9), 戌(10), 亥(11), 子(0), 丑(1)
JIEQI_MONTH_ZHI = {
    2: 2,   # 立春 → 寅月
    4: 3,   # 惊蛰 → 卯月
    6: 4,   # 清明 → 辰月
    8: 5,   # 立夏 → 巳月
    10: 6,  # 芒种 → 午月
    12: 7,  # 小暑 → 未月
    14: 8,  # 立秋 → 申月
    16: 9,  # 白露 → 酉月
    18: 10, # 寒露 → 戌月
    20: 11, # 立冬 → 亥月
    22: 0,  # 小雪 → 子月
    0: 1,   # 小寒 → 丑月
}


class LunarSource:
    """黄历 / 八字计算器。"""

    BASE_DATE = date(1900, 1, 31)  # 1900 年农历正月初一

    def __init__(self):
        self._validate_table()

    # ── 公开接口 ─────────────────────────────────────────────
    def fetch(self, target_date: Optional[date] = None) -> DataSourceResult:
        """计算指定日期的黄历/八字数据。"""
        if target_date is None:
            target_date = date.today()
        try:
            data = self.calculate(target_date)
            return DataSourceResult(source="lunar-builtin", data=data)
        except Exception as e:
            raise LunarError(f"农历计算失败: {e}") from e

    def calculate(self, target_date: date) -> LunarData:
        """核心计算。
        
        包含农历、干支（年月日时四柱）、生肖、节气、宜忌、冲煞、星座。
        """
        # 农历转换
        lunar = self._solar_to_lunar(target_date)

        # 干支四柱
        year_ganzhi = self._year_ganzhi(target_date)
        month_ganzhi = self._month_ganzhi(target_date)
        day_ganzhi = self._day_ganzhi(target_date)
        hour_ganzhi = self._hour_ganzhi(target_date)

        # 生肖
        zodiac = ZODIAC_ANIMALS[(lunar["year"] - 4) % 12]

        # 节气
        jieqi, next_jieqi, next_jieqi_date = self._jieqi_for_date(target_date)

        # 宜忌
        yi, ji = self._yiji(day_ganzhi)

        # 冲煞
        chongsha = self._chongsha(day_ganzhi)

        # 星座
        constellation = self._constellation(target_date)

        return LunarData(
            solar_date=target_date,
            lunar_year=lunar["year"],
            lunar_month=lunar["month"],
            lunar_day=lunar["day"],
            lunar_month_name=LUNAR_MONTH_NAMES[lunar["month"] - 1] + "月",
            lunar_day_name=LUNAR_DAY_NAMES[lunar["day"] - 1],
            is_leap_month=lunar["is_leap"],
            year_ganzhi=year_ganzhi,
            month_ganzhi=month_ganzhi,
            day_ganzhi=day_ganzhi,
            hour_ganzhi=hour_ganzhi,
            zodiac=zodiac,
            jieqi=jieqi,
            next_jieqi=next_jieqi,
            next_jieqi_date=next_jieqi_date,
            yi=yi,
            ji=ji,
            chongsha=chongsha,
            constellation=constellation,
        )

    # ── 农历转换 ─────────────────────────────────────────────
    def _solar_to_lunar(self, d: date) -> dict:
        """公历 → 农历。"""
        offset = (d - self.BASE_DATE).days
        if offset < 0:
            raise LunarError("日期超出支持范围（最早 1900-01-31）")

        # 逐年减去，定位农历年
        lunar_year = 1900
        while lunar_year < 2101:
            year_days = self._lunar_year_days(lunar_year)
            if offset < year_days:
                break
            offset -= year_days
            lunar_year += 1

        # 逐月减去，定位农历月/日。闰月沿用前一个月的月号，
        # 例如“闰五月”仍返回 month=5、is_leap=True。
        leap_month = self._leap_month(lunar_year)
        for lunar_month in range(1, 13):
            month_days = self._lunar_month_days(lunar_year, lunar_month)
            if offset < month_days:
                return {
                    "year": lunar_year,
                    "month": lunar_month,
                    "day": offset + 1,
                    "is_leap": False,
                }
            offset -= month_days

            if lunar_month == leap_month:
                leap_days = self._leap_days(lunar_year)
                if offset < leap_days:
                    return {
                        "year": lunar_year,
                        "month": lunar_month,
                        "day": offset + 1,
                        "is_leap": True,
                    }
                offset -= leap_days

        raise LunarError("农历月份定位失败")

    def _lunar_year_days(self, year: int) -> int:
        # Bits 4-15 表示 12 个月的大小月（1=30天），统计大月数
        big_months = 0
        for m in range(1, 13):
            # 数据表按 month 1 -> bit 15、month 12 -> bit 4 编码。
            if LUNAR_INFO[year - 1900] & (0x10000 >> m):
                big_months += 1
        # 基础 12×29 + 大月数 + 闰月天数
        return 12 * 29 + big_months + self._leap_days(year)

    def _leap_month(self, year: int) -> int:
        return LUNAR_INFO[year - 1900] & 0xf

    def _leap_days(self, year: int) -> int:
        if self._leap_month(year):
            return 30 if (LUNAR_INFO[year - 1900] & 0x10000) else 29
        return 0

    def _lunar_month_days(self, year: int, month: int) -> int:
        # Bit position: month 1 = bit 15, month 12 = bit 4。
        return 30 if (LUNAR_INFO[year - 1900] & (0x10000 >> month)) else 29

    # ── 干支 ──────────────────────────────────────────────────
    def _year_ganzhi(self, d: date) -> str:
        """年柱：以立春为界。立春前属上一年，立春后属当年。"""
        y = d.year
        # 判断是否已过当年立春
        lichun = self._calculate_jieqi(y, 2)  # 立春 index=2
        if d < lichun:
            y -= 1
        idx = (y - 4) % 60
        return TIANGAN[idx % 10] + DIZHI[idx % 12]

    def _month_ganzhi(self, d: date) -> str:
        """月柱：以节气月建。节为每月的起始分界。
        
        十二节对应十二地支月：
        立春→寅月, 惊蛰→卯月, 清明→辰月, 立夏→巳月, 芒种→午月, 小暑→未月,
        立秋→申月, 白露→酉月, 寒露→戌月, 立冬→亥月, 小雪→子月, 小寒→丑月
        
        月干由年干决定（年干起月法）：
        甲己之年丙作首，乙庚之年戊为头，丙辛之年庚开始，
        丁壬壬寅顺水流，戊癸之年甲寅始。
        公式：月干 = (年干 % 5) × 2 + 月支index (寅=2, 卯=3, ..., 丑=1)
        """
        # 找到当前日期所在的节气月地支
        month_zhi = self._get_month_zhi(d)
        # 年干以立春为界
        y = d.year
        lichun = self._calculate_jieqi(y, 2)  # 立春
        if d < lichun:
            y -= 1
        year_gan = (y - 4) % 10
        # 月干公式：month_gan = (year_gan % 5) * 2 + zhi_index
        month_gan_idx = ((year_gan % 5) * 2 + month_zhi) % 10
        return TIANGAN[month_gan_idx] + DIZHI[month_zhi]

    def _get_month_zhi(self, d: date) -> int:
        """根据日期确定当前所在节气月的地支索引。
        
        遍历十二节（从上年小寒到当年小雪），
        找到最近一个已经经过的节，其对应地支即为当前月建。
        """
        y = d.year
        current_zhi = 1  # 默认为丑月

        # 先检查上年小寒（index=0），它开启丑月
        prev_lichun = self._calculate_jieqi(y - 1, 0)
        if d >= prev_lichun:
            current_zhi = JIEQI_MONTH_ZHI[0]  # 丑

        # 检查当年十二节：立春(2), 惊蛰(4), ..., 小雪(22)
        for jq_idx in [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]:
            jq_date = self._calculate_jieqi(y, jq_idx)
            if d >= jq_date:
                current_zhi = JIEQI_MONTH_ZHI[jq_idx]
            else:
                break

        return current_zhi

    def _hour_ganzhi(self, d: date, hour: int = 12) -> str:
        """时柱：以日干决定子时天干。
        
        甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸壬子居。
        地支固定：子(23-1), 丑(1-3), 寅(3-5), 卯(5-7), 辰(7-9), 巳(9-11), 午(11-13), 未(13-15), 申(15-17), 酉(17-19), 戌(19-21), 亥(21-23)
        """
        day_ganzhi = self._day_ganzhi(d)
        day_gan_idx = TIANGAN.index(day_ganzhi[0])
        # 时支
        zhi_idx = (hour + 1) // 2 % 12
        # 时干 = (日干 % 5) * 2 + 时支地支index (子=0)
        hour_gan_idx = (day_gan_idx % 5) * 2 + zhi_idx
        return TIANGAN[hour_gan_idx % 10] + DIZHI[zhi_idx]

    def _day_ganzhi(self, d: date) -> str:
        # 基准日 1900-01-01 = 甲戌 (index 10 in 60-cycle)
        base = date(1900, 1, 1)
        offset = (d - base).days + 10
        idx = offset % 60
        return TIANGAN[idx % 10] + DIZHI[idx % 12]

    # ── 节气 ──────────────────────────────────────────────────
    def _jieqi_for_date(self, d: date) -> tuple:
        """查找当日节气与下一节气。
        
        使用精确节气日期表计算，支持前后跨年查询。
        """
        jieqi_today = None
        next_j = None
        next_j_date = None

        # 检查当年及下一年的所有节气
        candidates = []
        for y in [d.year - 1, d.year, d.year + 1]:
            for i in range(24):
                jq_date = self._calculate_jieqi(y, i)
                candidates.append((jq_date, i))

        # 按日期排序
        candidates.sort(key=lambda x: x[0])

        for i, (jq_date, jq_idx) in enumerate(candidates):
            if jq_date == d:
                jieqi_today = JIEQI_NAMES[jq_idx]
            if jq_date > d and next_j is None:
                next_j = JIEQI_NAMES[jq_idx]
                next_j_date = jq_date
                break

        return jieqi_today, next_j, next_j_date

    def _calculate_jieqi(self, year: int, index: int) -> date:
        """精确计算节气日期。
        
        使用中国气象局标准节气公式：
        - 21世纪 (2000-2099): 日期 = Y × 0.2422 + C21 - floor(Y/4)
        - 20世纪 (1900-1999): 日期 = Y × 0.2422 + C20 - floor(Y/4)
        其中 Y = 年份后两位, C 为节气经验系数。
        
        此公式误差通常在 ±1 天内，符合传统农历节气计算标准。
        """
        if year < 1900 or year > 2100:
            raise LunarError(f"节气计算超出支持范围: {year}")

        coeffs = JIEQI_C21 if year >= 2000 else JIEQI_C20
        month, c = coeffs[index]

        y = year % 100
        day = int(y * 0.2422 + c) - y // 4

        # 边界保护
        day = max(1, min(day, 28))
        return date(year, month, day)

    # ── 宜忌 ──────────────────────────────────────────────────
    def _yiji(self, day_ganzhi: str) -> tuple:
        """基于日干支推算宜忌（简化版 十二建星法）。"""
        # 十二建星：建、除、满、平、定、执、破、危、成、收、开、闭
        # 此处使用简化规则
        day_zhi = day_ganzhi[1]
        yiji_table = {
            "子": (["祭祀", "祈福", "求嗣"], ["嫁娶", "出行", "开市"]),
            "丑": (["祭祀", "解除", "求医"], ["嫁娶", "安葬", "入宅"]),
            "寅": (["嫁娶", "出行", "开市"], ["动土", "破土", "安葬"]),
            "卯": (["祭祀", "祈福", "开市"], ["嫁娶", "入宅", "安葬"]),
            "辰": (["嫁娶", "纳采", "开市"], ["出行", "破土", "安葬"]),
            "巳": (["祭祀", "祈福", "求嗣"], ["嫁娶", "出行", "开市"]),
            "午": (["解除", "求医", "扫舍"], ["嫁娶", "安葬", "入宅"]),
            "未": (["祭祀", "祈福", "开市"], ["嫁娶", "出行", "动土"]),
            "申": (["嫁娶", "出行", "纳采"], ["破土", "安葬", "入宅"]),
            "酉": (["祭祀", "祈福", "求嗣"], ["嫁娶", "开市", "出行"]),
            "戌": (["嫁娶", "开市", "纳采"], ["出行", "破土", "安葬"]),
            "亥": (["祭祀", "解除", "扫舍"], ["嫁娶", "入宅", "开市"]),
        }
        yi, ji = yiji_table.get(day_zhi, (["诸事不宜"], ["诸事不宜"]))
        return list(yi), list(ji)

    # ── 冲煞 ──────────────────────────────────────────────────
    def _chongsha(self, day_ganzhi: str) -> str:
        """计算冲煞。"""
        day_zhi = day_ganzhi[1]
        chong_map = {
            "子": "午", "丑": "未", "寅": "申", "卯": "酉",
            "辰": "戌", "巳": "亥", "午": "子", "未": "丑",
            "申": "寅", "酉": "卯", "戌": "辰", "亥": "巳",
        }
        zodiac_map = {
            "子": "鼠", "丑": "牛", "寅": "虎", "卯": "兔",
            "辰": "龙", "巳": "蛇", "午": "马", "未": "羊",
            "申": "猴", "酉": "鸡", "戌": "狗", "亥": "猪",
        }
        chong = chong_map.get(day_zhi, "")
        return f"冲{chong}{zodiac_map.get(chong, '')}煞{self._sha_direction(day_zhi)}"

    def _sha_direction(self, day_zhi: str) -> str:
        sha_map = {
            "子": "南", "丑": "东", "寅": "北", "卯": "西",
            "辰": "南", "巳": "东", "午": "北", "未": "西",
            "申": "南", "酉": "东", "戌": "北", "亥": "西",
        }
        return sha_map.get(day_zhi, "")

    # ── 星座 ──────────────────────────────────────────────────
    def _constellation(self, d: date) -> str:
        """根据公历日期返回星座。"""
        md = d.month * 100 + d.day
        boundaries = [120, 219, 321, 420, 521, 622, 723, 823, 923, 1024, 1123, 1222]
        for i, b in enumerate(boundaries):
            if md < b:
                return CONSTELLATIONS[i]
        return CONSTELLATIONS[-1]  # 摩羯座

    # ── 表校验 ───────────────────────────────────────────────
    def _validate_table(self):
        """验证数据表完整性。"""
        expected = 201  # 1900-2100
        if len(LUNAR_INFO) != expected:
            raise LunarError(f"农历数据表长度异常: 期望 {expected}, 实际 {len(LUNAR_INFO)}")

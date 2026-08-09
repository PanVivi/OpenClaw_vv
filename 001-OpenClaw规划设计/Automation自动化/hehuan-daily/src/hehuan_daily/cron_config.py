"""Cron 配置：OpenClaw Cron 任务定义。

此模块记录生产 Cron 的不变约束；实际声明使用 OpenClaw
2026.7.1-2 的 command-argv payload，不让 Agent 记忆决定是否执行。

OpenClaw Cron 配置：
- expression: '0 6 * * *' (每天 06:00)
- Agent: life
- telegram account: life
- timezone: Asia/Shanghai
- command timeout: 180s
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CronConfig:
    """Cron 任务配置。"""

    expression: str  # Cron 表达式
    agent: str  # 执行 agent
    account: str  # telegram account
    timezone: str  # 时区
    max_runtime_seconds: int  # 最大运行时间
    description: str  # 描述


# 晨间玉简 Cron 配置
MORNING_BRIEF_CRON = CronConfig(
    expression="0 6 * * *",
    agent="life",
    account="life",
    timezone="Asia/Shanghai",
    max_runtime_seconds=180,
    description="合欢宗晨间玉简 - 每日 06:00 发送",
)


def get_cron_config() -> CronConfig:
    """获取 Cron 配置。"""
    return MORNING_BRIEF_CRON


def render_cron_yaml(config: CronConfig | None = None) -> str:
    """渲染 OpenClaw Cron YAML 配置（供参考）。"""
    cfg = config or MORNING_BRIEF_CRON
    return f"""\
# OpenClaw Cron 声明摘要（实际使用 --command-argv）
cron:
  - name: hehuan-morning-brief
    schedule:
      expression: "{cfg.expression}"
      timezone: "{cfg.timezone}"
    agent: "{cfg.agent}"
    account: "{cfg.account}"
    maxRuntimeSeconds: {cfg.max_runtime_seconds}
    payload: "fixed command argv; no agent reasoning"
    description: "{cfg.description}"
"""

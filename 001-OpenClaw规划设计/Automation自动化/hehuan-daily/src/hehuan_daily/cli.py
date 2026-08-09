"""晨间玉简命令入口：离线预览与受控真实运行。"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, time
from pathlib import Path

from .clock import SystemClock
from .config import Config
from .final_brief import create_final_brief, final_gate_check
from .idempotency import ReceiptStore
from .models import AQIData, AQILevel, DataSourceResult, WeatherData
from .owner_profile import load_owner_template
from .lunar import LunarSource
from .pipeline import run_pipeline
from .scheduler import Scheduler
from .sender import MessageTransport, OpenClawCliTransport, Sender
from .runtime_status import record_run


def load_runtime_config(path: Path) -> tuple[Config, str, str, Path | None, Path | None, Path | None]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    allowed = {
        "data_dir",
        "timezone",
        "default_latitude",
        "default_longitude",
        "location_is_placeholder",
        "failure_notice_enabled",
        "waqi_token",
    }
    config_values = {key: value for key, value in raw.items() if key in allowed}
    config = Config(**config_values)
    account_id = str(raw.get("account_id", "life"))
    chat_id = str(raw.get("chat_id", ""))
    owner_profile_value = raw.get("owner_profile_path")
    owner_profile_path = (
        Path(owner_profile_value)
        if isinstance(owner_profile_value, str) and owner_profile_value.strip()
        else None
    )
    morning_inputs_value = raw.get("morning_inputs_path")
    morning_inputs_path = (
        Path(morning_inputs_value)
        if isinstance(morning_inputs_value, str) and morning_inputs_value.strip()
        else None
    )
    runtime_status_value = raw.get("runtime_status_path")
    runtime_status_path = (
        Path(runtime_status_value)
        if isinstance(runtime_status_value, str) and runtime_status_value.strip()
        else None
    )
    return config, account_id, chat_id, owner_profile_path, morning_inputs_path, runtime_status_path


def offline_preview(target_date: date, account_id: str, chat_id: str) -> str:
    # 离线预览绝不调用发送传输；示例配置可以保留明文占位符。
    # 最终结构闸门仍需要数字形式的 chatId，因此仅在本地预览中
    # 替换为无效且不可外发的 0；真实发送仍由 validate_for_real_send 拒绝 0。
    preview_chat_id = chat_id if chat_id.lstrip("-").isdigit() else "0"
    result = run_pipeline(
        target_date=target_date,
        weather_result=DataSourceResult(
            source="offline-fixture",
            data=WeatherData(
                temperature_c=22.0,
                apparent_temperature_c=22.0,
                daily_min_temp=19.0,
                daily_max_temp=27.0,
                daily_max_apparent_temp=29.0,
                humidity_pct=68.0,
                wind_speed_kmh=10.0,
                wind_gusts_kmh=18.0,
                daily_max_precip_probability=45,
                daily_weather_code=2,
                sunrise=time(4, 43),
                sunset=time(18, 59),
                uv_index=7.0,
                forecast_summary="离线验收数据，不代表实时天气",
            ),
            is_degraded=True,
            notes=["offline acceptance fixture"],
        ),
        aqi_result=DataSourceResult(
            source="offline-fixture",
            data=AQIData(
                aqi=50,
                level=AQILevel.GOOD,
                pm25=12.0,
                is_model_estimate=True,
            ),
            is_degraded=True,
            notes=["offline acceptance fixture"],
        ),
        lunar_result=LunarSource().fetch(target_date),
    )
    lines = result.composed.text.splitlines()
    preview_text = "\n".join([
        "说明：这是不外发的离线验收预览；天气与空气数据为测试值。",
        "",
        *lines,
    ])
    brief = create_final_brief(
        preview_text,
        account_id=account_id,
        chat_id=preview_chat_id,
        brief_date=target_date.isoformat(),
    )
    errors = final_gate_check(brief, expected_title="")
    if errors:
        raise RuntimeError("preview gate rejected: " + "; ".join(errors))
    return brief.text


def failure_notice_text(status: str) -> str:
    """只告诉少主真实影响和当前处理，不抛出工程原文。"""
    if status == "unknown":
        return (
            "少主，今日的晨间玉简是否送达还未核清，"
            "妾身已先停住自动重发，免得重复扰你。"
        )
    if status == "blocked_circuit":
        return (
            "少主，近几日的晨间玉简连续没有备妥，"
            "妾身已停下自动投递，待查清后再恢复。"
        )
    return (
        "少主，今日的晨间玉简没能按时备妥，"
        "妾身已记下此事，不会拿含糊内容来搪塞你。"
    )


def send_failure_notice(
    *,
    status: str,
    target_date: date,
    config: Config,
    account_id: str,
    chat_id: str,
    transport: MessageTransport,
):
    """发送一条独立幂等的角色化失败告知。"""
    notice = create_final_brief(
        failure_notice_text(status),
        account_id=account_id,
        chat_id=chat_id,
        brief_date=target_date.isoformat(),
        version=2,
    )
    sender = Sender(
        ReceiptStore(Path(config.data_dir) / "receipts.json"),
        config,
        gate_expected_title="",
        transport=transport,
    )
    return sender.send(notice)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="合欢宗晨间玉简")
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--date", help="YYYY-MM-DD；省略时按配置时区计算")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("preview", help="离线 fixture 预览，永不外发")
    run = sub.add_parser("run", help="运行真实数据路径")
    run.add_argument(
        "--send",
        action="store_true",
        help="显式启用 Telegram 发送；无此参数只生成不外发",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    # Windows 本地验收终端可能默认 GBK；角色化消息含 emoji，
    # 命令输出统一为 UTF-8，不影响 Linux/OpenClaw 运行。
    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if callable(reconfigure):
        reconfigure(encoding="utf-8")
    args = build_parser().parse_args(argv)
    (
        config,
        account_id,
        chat_id,
        owner_profile_path,
        morning_inputs_path,
        runtime_status_path,
    ) = load_runtime_config(args.config)
    clock = SystemClock()
    target_date = (
        date.fromisoformat(args.date)
        if args.date
        else clock.local_date(config.timezone)
    )

    if args.command == "preview":
        print(offline_preview(target_date, account_id, chat_id))
        return 0

    config.send_enabled = bool(args.send)
    transport = OpenClawCliTransport() if args.send else None
    template = None
    if owner_profile_path is not None:
        template = load_owner_template(
            owner_profile_path,
            target_date,
            timezone_name=config.timezone,
            latitude=config.default_latitude,
            longitude=config.default_longitude,
            morning_inputs_path=morning_inputs_path,
        )
    result = Scheduler(config=config, transport=transport, clock=clock).run(
        target_date=target_date,
        chat_id=chat_id,
        account_id=account_id,
        template=template,
    )
    if runtime_status_path is not None:
        record_run(
            runtime_status_path,
            brief_date=target_date.isoformat(),
            success=result.success,
            status=result.status,
            message_id=result.message_id,
        )
    failure_notice = None
    if args.send and not result.success and config.failure_notice_enabled:
        failure_notice = send_failure_notice(
            status=result.status,
            target_date=target_date,
            config=config,
            account_id=account_id,
            chat_id=chat_id,
            transport=OpenClawCliTransport(),
        )
    print(json.dumps({
        "success": result.success,
        "status": result.status,
        "idempotencyKey": result.idempotency_key,
        "messageId": result.message_id,
        "error": result.error,
        "degradedModules": result.degraded_modules,
        "failedModules": result.failed_modules,
        "failureNoticeStatus": (
            failure_notice.receipt_status if failure_notice is not None else None
        ),
        "failureNoticeMessageId": (
            failure_notice.message_id if failure_notice is not None else None
        ),
    }, ensure_ascii=False))
    return 0 if result.success else 2


if __name__ == "__main__":
    raise SystemExit(main())

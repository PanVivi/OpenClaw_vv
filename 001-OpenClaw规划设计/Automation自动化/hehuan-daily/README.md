# 合欢宗晨间玉简（hehuan-daily）

这是 `life` / 蕭观音每日 06:00 晨间消息的确定性生成与投递程序。时间触发、数据获取、内容闸门、幂等和发送收据均由程序执行，不要求角色模型“记住去调用”。

## 完成边界

- 天气：Open-Meteo 主源，MET Norway 备源。
- 空气：WAQI 可选，未配置或不可用时明确降级到 Open-Meteo CAMS 模型估算。
- 农历/节气：本地计算，不依赖网络。
- 日程：只读取 `life` 专属资料区中已确认的当日排班。出生、身份等无关私密字段不会投影进晨间消息。
- 投递：固定通过 OpenClaw 现有 `life` Telegram account 发送，程序不读取和不保存 Bot token。
- 时区：生产使用所在地的明确 IANA 时区。

## 安全语义

- 没有 `--send` 时只生成，绝不外发；`preview` 只使用标明为测试值的离线数据。
- 真实发送前必须同时满足：`account_id=life`、已核实数字 chat ID、非占位地点、有效时区和显式 `--send`。
- 只有 OpenClaw 返回结构化的真实 message ID 才记为 `sent`。
- 超时、断线或不明结果记为 `unknown_needs_reconcile`，在人工核对前禁止自动重发。只有明确“未送出”的错误允许重试。
- 收据、熔断和模板使用同目录唯一临时文件、`fsync`、原子替换和跨进程文件锁。状态损坏会保留证据并停止外发。
- 同一自然日的重复失败只计一天；连续 3 天同根因告警，连续 5 个自然日失败停止自动发送。

## 私密边界

仓库只保存程序、占位示例和测试。生产配置与业主资料都位于：

```text
/Volume3/OpenClaw/home/.openclaw/agents/life/users/Vivi/
```

它们不进入 Git。程序只接受该专属根目录下的普通 JSON 文件，拒绝路径逃逸和符号链接。经纬度、chat ID 和业主资料路径只放在权限 `0600` 的生产配置里。

## 运行

```bash
python3 -m hehuan_daily --config /path/to/runtime.json --date 2026-08-04 preview
python3 -m hehuan_daily --config /path/to/runtime.json run
python3 -m hehuan_daily --config /path/to/runtime.json run --send
```

离线预览允许使用 `config.example.json` 的占位 chat ID；真实运行会拒绝它。

## OpenClaw Cron

生产使用 OpenClaw 2026.7.1-2 支持的 command payload，直接执行固定 argv，不经过 Agent 推理：

```text
schedule     0 6 * * *
timezone     Asia/Shanghai
exact        true
payload      command-argv (python -m hehuan_daily ... run --send)
delivery     no-deliver（程序自行通过 life account 投递唯一消息）
```

使用固定 `declaration-key` 声明，避免重复建立任务。Cron 运行的 stdout 只返回状态 JSON，不含私人资料和 Bot token。

## 验收

```bash
python3 -m compileall -q -f src tests
python3 -m unittest discover -s tests -v
```

当前仓库基线为 264 项通过；Windows 仅跳过 1 项 POSIX `0600` 权限位测试，部署后必须在 NAS 补验。启用前还必须完成：生产无外发预览、一次真实投递、同键重跑不重发、Cron 时区/次日运行时间和收据一致性验收。

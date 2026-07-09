# TelegramBotPollingConflict 轮询冲突观察｜v0.01

- **状态**：Resolved（2026-07-07）
- **发现时间**：2026-07-06 12:07 CST / UTC+8
- **恢复时间**：2026-07-07 14:00 CST / UTC+8
- **持续时长**：约 26 小时
- **关联文档**：INC-2026-0001、Change-0003、Change-0004

---

## 现象

2026-07-06 12:07 起，Telegram Bot 已读不回，持续约 26 小时。  
Gateway 日志显示 health-monitor 每 15 分钟循环重启，无法自行恢复。

---

## 诊断过程

### 排除项

| 嫌疑 | 结论 | 依据 |
|---|---|---|
| Change-0003 配置改坏 | 排除 | Jul 5 11:37 Change-0003 close 后 Telegram 真实流量 Smoke Test 通过，魚玄機在 Telegram 正常回复 |
| OpenAI API Key 缺失 | 排除 | OBSERVATION-001 在 Jul 5 11:37 已存在，当时 Telegram 仍正常 |
| NAS 持续网络不可达 | 不支持 | NAS shell `getMe` 返回 http_code=200 / ok:true，说明测试时 Bot API 短请求可用；不支持"持续网络不可达"判断 |
| OpenClash DNS 劫持 | 排除 | 198.18.0.8 是 OpenClash Fake-IP 正常行为，非异常 |
| OpenWrt/代理持续不可达 | 不支持 | NAS shell `getMe` 返回 http_code=200 / ok:true，说明测试时 Bot API 短请求可用；不支持"持续网络不可达"判断 |

### 关键证据

**Jul 6 断连时间线（Gateway 日志）：**

```
12:07:00  首次 UND_ERR_CONNECT_TIMEOUT
12:08~12:18  指数退避：10s → 20s → 40s → 60s
12:19:13  channel exited，auto-restart 1/10
12:19:33  getMe 超时 15s；provider 继续启动，menu 构建完成（73 commands visible）
12:19:48  fetch fallback 再次超时
12:19:58  deleteWebhook 失败  ← 注：此为历史 Gateway/provider 日志，非 Runbook 建议手动执行项
12:21:20  health-monitor: restarting (reason: disconnected)
12:21:25  释放 polling lease
12:21:30  channel stop 超时 >5000ms  ← shutdown 异常关键证据
此后      health-monitor 每 15 分钟 restarting (reason: stopped)
```

**Jul 7 Bot API 级别测试（NAS shell）：**

```
getMe:      http_code=200  time=0.99s  ok:true        ✅
getUpdates: http_code=409  time=5.41s  error_code:409
            "Conflict: terminated by other getUpdates request;
             make sure that only one bot instance is running"  ⚠️
```

---

## 根因分析

**高置信度结论：**

OpenClaw Telegram provider / channel 生命周期恢复异常。

1. Jul 6 12:07 出现 `UND_ERR_CONNECT_TIMEOUT`，可能由短暂网络 / 代理 / Telegram API 波动触发
2. provider 关闭时旧 `getUpdates` 长轮询连接未正常释放（`channel stop exceeded 5000ms after abort` 为佐证）
3. Telegram 端仍判定同一 bot 存在 getUpdates polling 客户端，推定旧 provider / 旧 polling 状态未完全释放
4. health-monitor 每 15 分钟重启新 provider，新实例发起 `getUpdates` → Telegram 返回 `409 Conflict` → 新实例失败 → 循环

**保留不确定性：**

- Jul 6 12:07 的 `UND_ERR_CONNECT_TIMEOUT` 触发原因未完全定位（网络波动 / 代理 / Telegram API 均为可能）
- 手动 `getUpdates` 与旧 channel 释放发生在同一时间窗口，可能促成或恰逢释放；因果关系未完全证明

---

## 恢复过程

2026-07-07 14:00 CST，在 NAS shell 执行受控 `getUpdates` 测试，返回 `409 Conflict`。随后 Gateway 日志出现：

```
14:00:02  [telegram] restarting after timed-out channel stop completed
14:00:03  [telegram] starting provider (@<telegram_bot>)
14:00:03  [telegram] menu text exceeded... 73 commands visible
14:00:05  [telegram] isolated polling ingress started
14:00:05  [telegram] Inbound message telegram:<redacted_user_id> → @<telegram_bot>
```

旧 stuck channel 超时释放，新 provider 成功启动，Telegram 恢复正常收发。

---

## Recovery Runbook

### 前置条件（须同时满足）

1. Telegram 已读不回
2. `getMe` 返回 `ok:true`（http_code=200）
3. Gateway 日志出现 `provider restart loop` 或 `channel stop timeout` 或 `polling ingress` 异常等证据
4. 确认没有已知的人为第二 bot 实例或外部 polling 客户端
5. bot 当前不是正常回复状态

### 执行命令（NAS shell，不输出 token）

```bash
BASE="/Volume3/OpenClaw/home/.openclaw"
TOKEN=$(node -e 'const fs=require("fs"); const c=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const t=c.channels?.telegram?.accounts?.default?.botToken || c.channels?.telegram?.botToken || ""; console.log(t)' "$BASE/openclaw.json")

echo "token_length=${#TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "ERROR: token empty"
  exit 1
fi

curl -sS --connect-timeout 5 --max-time 25 \
  "https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=10&limit=1" \
  | node -e 'let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{ try{const j=JSON.parse(d); console.log({ok:j.ok,error_code:j.error_code,description:j.description});}catch(e){console.log("non-json");}})'
```

### 执行后判断

| 结果 | 含义 | 下一步 |
|---|---|---|
| `409 Conflict` | Telegram 端检测到 polling 冲突，倾向 provider/channel 状态恢复异常 | 观察 Gateway 日志是否自行恢复；如未恢复，等待下一轮 health-monitor 重启 |
| `ok:true` | NAS 到 Bot API polling 当前可用 | 继续查 OpenClaw provider runtime / channel lease |
| timeout | NAS 网络 / 代理 / Telegram API 链路问题 | 重新排查网络层 |
| token empty | 配置路径或 token 提取问题 | 检查 openclaw.json 配置 |

### 限制

- 不执行 `deleteWebhook`
- 不传 `offset`
- 不输出 token
- 不贴 bot username 或用户 ID
- 不设为定时任务
- 不在 bot 正常回复时执行

---

## 当前不做项

- 不重启 Gateway
- 不改 OpenWrt / OpenClash / hosts
- 不回滚 Change-0003 / Change-0004
- 不改 systemd `RestartSec`
- 不将 OpenAI API Key 缺失归因至本 Observation

---

## 后续建议

- 向 OpenClaw 上游反馈：provider shutdown 时 `channel stop` 超时未能正确释放长轮询连接，属 channel 生命周期 bug
- `RestartSec` 冷却间隔评估：低优先级研究项，可能减少 409 Conflict 循环频率；当前不修改，需少爷批准后执行

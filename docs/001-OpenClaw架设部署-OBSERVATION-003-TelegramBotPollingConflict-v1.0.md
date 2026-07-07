# OBSERVATION-003 — Telegram Bot 已读不回 / Polling Conflict

- **状态**：Resolved（2026-07-07）
- **发现时间**：2026-07-06 12:07 CST
- **恢复时间**：2026-07-07 14:00 CST
- **持续时长**：约 25 小时
- **关联文档**：INC-2026-0001、Change-0003、Change-0004

---

## 现象

2026-07-06 12:07 起，Telegram Bot (@Yuxuanji_claw_bot) 已读不回，持续约 25 小时。  
Gateway 日志显示 health-monitor 每 15 分钟循环重启，无法自行恢复。

---

## 诊断过程

### 排除项

| 嫌疑 | 结论 | 依据 |
|---|---|---|
| Change-0003 配置改坏 | 排除 | Jul 5 11:37 Change-0003 close 后 Telegram 真实流量 Smoke Test 通过，魚玄機在 Telegram 正常回复 |
| OpenAI API Key 缺失 | 排除 | OBSERVATION-001 在 Jul 5 11:37 已存在，当时 Telegram 仍正常 |
| NAS 持续网络不可达 | 排除 | NAS shell `curl getMe` 返回 http_code=200 / ok:true，token 有效 |
| OpenClash DNS 劫持 | 排除 | 198.18.0.8 是 OpenClash Fake-IP 正常行为，非异常 |
| OpenWrt/代理配置问题 | 排除 | NAS shell Bot API 短请求可用，代理链路正常 |

### 关键证据

**Jul 6 断连时间线（Gateway 日志）：**

```
12:07:00  首次 UND_ERR_CONNECT_TIMEOUT
12:08~12:18  指数退避：10s → 20s → 40s → 60s
12:19:13  channel exited，auto-restart 1/10
12:19:33  getMe 超时 15s；provider 继续启动，menu 构建完成（73 commands visible）
12:19:48  fetch fallback 再次超时
12:19:58  deleteWebhook 失败
12:21:20  health-monitor: restarting (reason: disconnected)
12:21:25  释放 polling lease
12:21:30  channel stop 超时 >5000ms  ← shutdown 异常关键证据
此后      health-monitor 每 15 分钟 restarting (reason: stopped)
```

**Jul 7 Bot API 级别测试：**

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

1. Jul 6 12:07，路由器代理出现短暂波动，触发 `UND_ERR_CONNECT_TIMEOUT`
2. provider 关闭时旧 `getUpdates` 长轮询连接未正常释放（`channel stop exceeded 5000ms` 为佐证）
3. 旧连接仍占据 Telegram 服务端 bot session
4. health-monitor 每 15 分钟重启新 provider，新实例发起 `getUpdates` → Telegram 返回 `409 Conflict` → 新实例失败 → 循环

**保留不确定性：**

- Jul 6 12:07 的 `UND_ERR_CONNECT_TIMEOUT` 可能是短暂网络/代理/API 波动；后续长期阻塞的主要原因是 provider 状态恢复异常，而非持续网络不可达
- 手动 `getUpdates` 与旧 channel 释放发生在同一时间窗口，可能促成或恰逢释放；因果关系未完全证明

---

## 恢复过程

2026-07-07 14:00，手动在 NAS shell 执行 `curl getUpdates`，返回 `409 Conflict`。随后 Gateway 日志出现：

```
14:00:02  [telegram] restarting after timed-out channel stop completed
14:00:03  [telegram] starting provider (@Yuxuanji_claw_bot)
14:00:03  [telegram] menu text exceeded... 73 commands visible
14:00:05  [telegram] isolated polling ingress started
14:00:05  [telegram] Inbound message telegram:811150402 → @Yuxuanji_claw_bot
```

旧 stuck channel 超时释放，新 provider 成功启动，Telegram 恢复正常收发。

---

## Recovery Runbook

下次出现 Telegram 已读不回时，**仅在同时满足以下所有条件**时执行：

1. Telegram 已读不回
2. `getMe` 返回 `ok:true`（http_code=200）
3. `getUpdates` 返回 `409 Conflict`
4. Gateway 日志出现 `provider restart loop` 或 `channel stop timeout`
5. 确认无第二个 bot 实例在运行

**执行命令（NAS shell，不输出 token）：**

```bash
BASE="/Volume3/OpenClaw/home/.openclaw"
TOKEN=$(node -e 'const fs=require("fs"); const c=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const t=c.channels?.telegram?.accounts?.default?.botToken || c.channels?.telegram?.botToken || ""; console.log(t)' "$BASE/openclaw.json")
curl -sS --connect-timeout 5 --max-time 25 \
  "https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=10&limit=1" \
  | node -e 'const fs=require("fs"); let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{ try{const j=JSON.parse(d); console.log({ok:j.ok,error_code:j.error_code,description:j.description});}catch(e){console.log("non-json");}})'
```

**限制：**
- 不执行 `deleteWebhook`
- 不传 `offset`
- 不输出 token
- 不贴 bot username 或用户 ID
- 不设为定时任务
- 不在 bot 正常回复时执行

---

## 当前不做

- 不重启 Gateway
- 不改 OpenWrt / OpenClash / hosts
- 不回滚 Change-0003 / Change-0004
- 不改 systemd `RestartSec`
- 不将 OpenAI API Key 缺失归因至本 Observation

---

## 后续建议

- 向 OpenClaw 上游反馈：provider shutdown 时 `channel stop` 超时未能正确释放长轮询连接（`channel stop exceeded 5000ms after abort`），属于 channel 生命周期 bug
- 可评估是否配置 `RestartSec` 冷却间隔，减少 409 Conflict 循环频率（需少爷批准后执行）

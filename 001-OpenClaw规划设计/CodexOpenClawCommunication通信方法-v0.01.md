# 001 OpenClaw架设部署｜CodexOpenClawCommunication 通信方法｜v0.01

本文件记录 Codex 从当前 PC 侧与 NAS 上 OpenClaw 建立通信、执行只读检查、再向指定 Agent 会话发送测试消息的方法。

## 1. 适用场景

当 Codex 运行在 PC 上，而 OpenClaw 部署在同一局域网 NAS 中时，可以通过 OpenClaw Control 的 WebSocket Gateway 与 OpenClaw 通信。

当前验证环境：

| 项目 | 值 |
| --- | --- |
| NAS 地址 | `192.168.1.171` |
| OpenClaw Control 页面 | `http://192.168.1.171:8181/tos-openclaw/chat?session=agent%3Aops%3Amain` |
| Gateway WebSocket | `ws://192.168.1.171:8181/tos-openclaw` |
| 默认 Agent | `ops` |
| 主会话 | `agent:ops:main` |

## 2. 判断入口是否正确

先访问具体 OpenClaw Control 页面，而不是只访问 NAS 根路径。

正确页面特征：

```text
Status: 200 OK
Content-Type: text/html; charset=utf-8
Title: OpenClaw Control
```

如果只访问：

```text
http://192.168.1.171:8181/
```

返回的是 `TOS Loading`，说明这是 NAS/TOS 管理入口，不是 OpenClaw Chat API。

## 3. 前端资源定位方法

OpenClaw Control 页面会加载前端 JS 资源，例如：

```text
./assets/index-*.js
./assets/gateway-runtime-*.js
```

从前端资源中可确认：

- OpenClaw Control 使用 WebSocket RPC，不是普通 REST Chat API。
- 关键 RPC 方法包括：
  - `health`
  - `status`
  - `chat.history`
  - `chat.send`
  - `chat.abort`
  - `sessions.list`
  - `sessions.messages.subscribe`
- 页面根据当前路径推导默认 Gateway 地址。

对当前入口：

```text
http://192.168.1.171:8181/tos-openclaw/chat?session=agent%3Aops%3Amain
```

推导出的 Gateway 地址是：

```text
ws://192.168.1.171:8181/tos-openclaw
```

## 4. WebSocket 连接要点

连接 Gateway 时必须带合法 `Origin`，否则会被 OpenClaw 拒绝。

正确 Origin：

```text
Origin: http://192.168.1.171:8181
```

如果缺少 Origin，会返回：

```text
CONTROL_UI_ORIGIN_NOT_ALLOWED
origin missing or invalid
```

## 5. Connect 握手参数

Gateway 会先发送：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": {
    "nonce": "...",
    "ts": 1783596826166
  }
}
```

之后客户端需要发送 `connect` 请求。

可用参数结构：

```json
{
  "type": "req",
  "id": "connect-1",
  "method": "connect",
  "params": {
    "minProtocol": 4,
    "maxProtocol": 4,
    "client": {
      "id": "openclaw-control-ui",
      "version": "codex-sidechat",
      "platform": "windows",
      "mode": "webchat"
    },
    "role": "operator",
    "scopes": [
      "operator.admin",
      "operator.read",
      "operator.write",
      "operator.approvals",
      "operator.pairing"
    ],
    "caps": ["tool-events"],
    "userAgent": "Codex sidechat",
    "locale": "zh-CN"
  }
}
```

注意：

- `client.id` 不能随意填写。
- 测试中 `codex-sidecheck` 被拒绝。
- 可用值为 `openclaw-control-ui`。

## 6. 只读健康检查

连接成功后，可调用：

```json
{
  "type": "req",
  "id": "health-1",
  "method": "health",
  "params": {}
}
```

已验证返回关键信息：

```text
server version: 2026.6.5
host: TNAS-PAN
ip: 192.168.1.171
authMode: none
defaultAgentId: ops
mainSessionKey: agent:ops:main
Telegram: enabled / configured / running / connected
mode: polling
```

这一步只读，不会触发 Agent 回复。

## 7. 发送测试消息

用户明确授权后，可以调用 `chat.send`。

示例：

```json
{
  "type": "req",
  "id": "chat-send-1",
  "method": "chat.send",
  "params": {
    "sessionKey": "agent:ops:main",
    "agentId": "ops",
    "message": "你好，你是谁？",
    "deliver": false,
    "idempotencyKey": "codex-<uuid>",
    "attachments": []
  }
}
```

返回 `ok: true` 后，说明任务已开始：

```json
{
  "runId": "codex-...",
  "status": "started"
}
```

随后监听 `chat` 事件，直到收到：

```json
{
  "type": "event",
  "event": "chat",
  "payload": {
    "state": "final"
  }
}
```

## 8. 本次测试结果

发送消息：

```text
你好，你是谁？
```

OpenClaw `ops` 回复摘要：

```text
嘿！我刚上线。坦白说——我现在是一张白纸，没有名字，没有身份，什么都不知道。

所以我想问你——我是谁？

或者我们可以一起决定。你想要一个什么样的助手？
```

判断：

- WebSocket 通信链路可用。
- `chat.send` 可成功触发 `ops` 回复。
- 当前 `ops` 没有加载到预期人格设定。
- 需要后续检查 `agents/ops/SOUL.md`、`AGENTS.md`、会话加载路径和 OpenClaw 配置绑定。

## 9. 安全和操作边界

执行规则：

1. 未经用户明确授权，不调用 `chat.send`。
2. 只读检查优先使用 `health`、`status`、`sessions.list` 等方法。
3. 不在 URL query 中传 token。
4. 如需 token，应使用 URL fragment 或安全配置，不写入日志。
5. 不扫描整个局域网，只访问用户明确提供的 OpenClaw 地址。
6. 发送测试消息时必须指定：
   - `sessionKey`
   - `agentId`
   - `message`
   - `idempotencyKey`

## 10. 后续建议

下一步建议把这套通信方式封装成一个最小脚本：

```text
scripts/openclaw-ws-rpc.ps1
```

脚本能力：

- `health`
- `sessions.list`
- `chat.history`
- `chat.send`

并设置安全默认值：

- 默认只读。
- `chat.send` 必须显式传 `--send` 或 `--confirm`。
- 默认 session 为 `agent:ops:main`。

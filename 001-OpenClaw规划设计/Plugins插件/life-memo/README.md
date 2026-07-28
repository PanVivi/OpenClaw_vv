# Life Owner Files Tool Plugin

OpenClaw 2026.7.1 及以上的受限 Tool Plugin。它只向 `life` Agent 暴露 `life_files`，让萧观音在少主专属生活资料区管理目录和 UTF-8 文本文件。

生产根目录固定为：

```text
/Volume3/OpenClaw/home/.openclaw/agents/life/users/Vivi/
```

## 能力

- `list`：列出专属资料区或其子目录；
- `get`：读取一个受支持的文本文件；
- `mkdir`：创建专属资料区内的子目录；
- `create`：排他创建文件，不覆盖同名文件；
- `update`：原子替换既有普通文件；
- `append`：向既有普通文件追加内容。

支持 `.md`、`.txt`、`.json`、`.csv`、`.ics`，单文件上限 256 KiB。

## 权限边界

- 仅在运行时 `agentId=life` 时注册工具。
- 每次调用只接受相对路径；拒绝绝对路径、反斜线、`.`、`..`、控制字符、空路径段、超过六层的目录和超过 240 字符的路径。
- 根目录、中间目录和目标文件逐层拒绝符号链接；文件必须是普通文件。
- 新目录权限 `0700`，新文件和替换文件权限 `0600`。
- 不提供删除、重命名、shell、脚本、可执行文件、OpenClaw 配置、角色卡、session、memory 或其他 Agent 文件访问。
- 通用 `read/write/edit/apply_patch/exec/process` 继续对 `life` 保持拒绝。

## 配置

```json
{
  "agentId": "life",
  "ownerRoot": "/Volume3/OpenClaw/home/.openclaw/agents/life/users/Vivi"
}
```

## 验收重点

1. `life` 可见并可调用 `life_files`，其他 Agent 不可见。
2. 能创建 `备忘录/Vivi.md` 并由工具回读。
3. 能创建其他生活资料子目录和允许类型文件。
4. 重复 `create` 不覆盖；路径逃逸、符号链接、未允许扩展名和超限内容均拒绝。
5. 既有 `life_automation`、Workboard、Telegram 和通用工具 deny 不回退。

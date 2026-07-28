# 002 OpenClaw架设部署｜Life Owner Files 萧观音少主专属资料区修复计划｜v0.01

- 计划时间：2026-07-28
- 需求来源：用户在窄版备忘录插件最终验收前提出范围调整
- 目标 Agent：`life` / 萧观音
- 状态：`PLAN VERIFIED`

## 一、调整后的目标

在萧观音自己的工作区建立少主专属生活资料区：

```text
/Volume3/OpenClaw/home/.openclaw/agents/life/users/Vivi/
```

萧观音可在该根目录下创建子目录，并管理生活相关的 UTF-8 文本文件。首个真实验收文件为：

```text
备忘录/Vivi.md
```

## 二、允许能力

- 列出专属资料区或子目录；
- 读取文件；
- 创建子目录；
- 排他创建文件；
- 原子更新文件；
- 追加文件；
- 文件类型：`.md`、`.txt`、`.json`、`.csv`、`.ics`；
- 单文件上限：256 KiB；
- 最大目录深度：6；
- 目录权限 `0700`，文件权限 `0600`。

## 三、继续禁止

- 删除、移动、重命名；
- shell、exec、process；
- 通用 `read/write/edit/apply_patch`；
- 可执行脚本和任意二进制文件；
- life 根目录中的角色卡、session、memory、recovery 和隐藏状态；
- OpenClaw 配置、Gateway、凭据和其他 Agent 数据；
- 符号链接及任何路径逃逸。

## 四、生产变更

沿用已安装但尚未完成正式用户文件验收的 `life-memo` 插件 ID，将其升级到 1.1.0：

- 工具由 `life_memo` 替换为 `life_files`；
- 插件固定根由 `memos/` 改为 `users/Vivi/`；
- 配置移除旧工具 allow，新增 `life_files`；
- 现有通用 deny 原样保留；
- Gateway 再重启一次加载升级版。

窄版尚未创建任何正式用户文件，因此不需要迁移用户数据。

## 五、验收

1. 插件本地集成测试输出 `LIFE_OWNER_FILES_TEST_OK`。
2. Gateway、config validate、plugin doctor 和 Telegram probe 健康。
3. `life` 真实调用 `life_files` 创建并回读 `备忘录/Vivi.md`。
4. 磁盘内容、大小、权限与 SHA-256 和工具结果一致。
5. `ops` 或其他 Agent 不可见 `life_files`。
6. 路径逃逸、脚本扩展、符号链接和重复创建被拒绝。
7. `life_automation`、Workboard、sessions、Bot 和通用 deny 不回退。

## 六、回滚

使用部署前备份恢复 `openclaw.json`，重启 Gateway；保留 `users/Vivi/` 中已创建的用户数据，不自动删除。插件目录只归档，不以删除用户文件作为回滚手段。

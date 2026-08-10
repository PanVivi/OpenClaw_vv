# 本地未提交文件核验｜v0.01

核验时间：2026-08-10

比较基线：刷新后的全部 `origin/*` 引用、GitHub PR 状态和最新生产修复分支。

## 核验范围

已检查本仓库登记的全部 Git worktree。除旧主工作区、一个 detached 运维工作树和 `agent/lossless-content-update` 工作树外，其余 life memo、晨报修复、角色卡审核和任务系统修复工作树均为 clean。

## 分类结论

### 1. 旧主工作区

当前分支 `codex/restructure-openclaw-docs` 已合并且落后 `origin/main` 345 个提交。其删除和 README 修改来自早期文档重构；大量同名未跟踪文档虽然版本号相同，但内容比 GitHub 当前文件旧，不能整体提交，否则会回退权威入口。

该工作区还包含本地 SSH 凭据目录、Playwright trace、Mini Muse 生成/验收产物和一次性远端审计脚本。它们不是 OpenClaw Git 权威源，本轮不删除、不提交，也不输出凭据内容。

### 2. detached 运维工作树

存在若干一次性 SSH/Gateway/Workboard 运维脚本和 `pw.txt`。这些文件未被任何远端分支跟踪，且包含可复用连接资产或现场操作细节；全部保留本地，不进入 Git。

### 3. `agent/lossless-content-update` 工作树

有三处受跟踪差异和 Playwright 临时目录：

- `CodexResetWatcher.mjs` 增加 `--model custom-3/LongCat-2.0`：生产现场逐行确认，纳入本次 Git 更新。
- Task Panel 部署计划和报告各增加 Scanner 永久停用警示：事实有效，但历史 v0.01 不应原地改写，改由 `CodexTaskPanel停用与稳定性门禁-v0.01.md` 承接。
- `.playwright-mcp/`：本地浏览器 trace，不提交。

## 安全处置

- 未删除或覆盖任何用户现有文件、私钥、密码文件、日志、会话或生成资产。
- `.gitignore` 新增 `.codex-temp-*/`、`.playwright-mcp/`、`pw.txt` 和本仓库无关的 Mini Muse 生成产物规则，降低误提交风险。
- GitHub 更新从最新任务系统修复提交建立隔离分支，不在脏旧工作区上切换、reset 或强行合并。

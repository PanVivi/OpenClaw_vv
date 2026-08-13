# 生产备份 SHA-256 清单

> 备份时间：2026-08-13
> 备份来源：`\\192.168.1.171\OpenClaw\home\.openclaw\` (SMB)
> 生产路径：`/Volume3/OpenClaw/home/.openclaw/`
> OpenClaw 版本：`2026.7.1-2 (0790d9f)`

## 插件文件 (workflow-governance 1.2.0)

| 文件 | SHA-256 | 备注 |
|------|---------|------|
| `workflow-governance/dist/index.js` | `96bc4f7c9ef9433533512c62b785076cc42887e6c621cbcd147a510c2234c828` | 生产入口，526 行，与交接记录一致 |
| `workflow-governance/package.json` | `3591fe4306bdf7fd5dfbfcbad757feda1cb75bd51ef864150b7f9f5d3548b6df` | 版本 1.2.0 |
| `workflow-governance/openclaw.plugin.json` | `e9c4f4781d3cd0c0279aecd609940f90a99fb82eb84519f2d4366ec5a0c1b5dc` | 含 riskAgentIds、decisionAgentId、ownerSessionKey、taskStatePath |
| `workflow-governance/README.md` | `342e30555f9411c72a166c7e3791439becf8f7e6a0f697048f9af51d00f16d16` | 1.2.0 说明 |

## 角色规则文件

| 文件 | SHA-256 | 备注 |
|------|---------|------|
| `ops-AGENTS.md` | `57745f46adfbb73e8436cec41db94845e5ec9326cdf18e2d5246e384d4c11822` | 鱼玄机 v0.19 |
| `ops-PERMISSIONS.md` | `ce2a31397a5aed23a904bd631ce56b67df0004560fb9a9b7c355cdabf10bf74a` | 鱼玄机权限矩阵 |
| `reviewer-AGENTS.md` | `a538e6843d697a140c239067e12393cfdfad69551228cad200c2bd058a04b905` | 夏姬 v0.10 |
| `housekeeper-AGENTS.md` | `c7c739f08a377600061b138ae13414fc79ac8844970b0205e405ce027f7cd989` | 贾南风 v1.19 |

## 回退方法

部署前出现任何异常时，使用以上哈希校验备份文件完整性后，按原路径恢复：
- 插件目录：`/Volume3/OpenClaw/home/.openclaw/extensions/workflow-governance/`
- ops 规则：`/Volume3/OpenClaw/home/.openclaw/agents/ops/AGENTS.md` 和 `PERMISSIONS.md`
- reviewer 规则：`/Volume3/OpenClaw/home/.openclaw/agents/reviewer/AGENTS.md`
- housekeeper 规则：`/Volume3/OpenClaw/home/.openclaw/agents/housekeeper/AGENTS.md`

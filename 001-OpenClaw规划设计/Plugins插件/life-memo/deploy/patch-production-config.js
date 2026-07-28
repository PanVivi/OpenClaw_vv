import { chmod, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const configPath = "/Volume3/OpenClaw/home/.openclaw/openclaw.json";
const ownerRoot = "/Volume3/OpenClaw/home/.openclaw/agents/life/users/Vivi";
const config = JSON.parse(await readFile(configPath, "utf8"));

config.plugins ??= {};
config.plugins.allow ??= [];
if (!config.plugins.allow.includes("life-memo")) {
  config.plugins.allow.push("life-memo");
}
config.plugins.entries ??= {};
config.plugins.entries["life-memo"] = {
  enabled: true,
  config: {
    agentId: "life",
    ownerRoot
  }
};

const life = config.agents?.list?.find((agent) => agent.id === "life");
if (!life) throw new Error("life agent is missing");
life.tools ??= {};
life.tools.allow ??= [];
life.tools.allow = life.tools.allow.filter((tool) => tool !== "life_memo");
if (!life.tools.allow.includes("life_files")) {
  life.tools.allow.push("life_files");
}

const requiredDeny = [
  "sessions_history",
  "exec",
  "process",
  "read",
  "write",
  "edit",
  "apply_patch",
  "gateway",
  "message"
];
for (const tool of requiredDeny) {
  if (!life.tools.deny?.includes(tool)) {
    throw new Error(`refusing deployment because life deny is missing: ${tool}`);
  }
}
if (life.tools.fs?.workspaceOnly !== true) {
  throw new Error("refusing deployment because life workspaceOnly is not true");
}

const tempPath = `${configPath}.tmp-life-memo-${randomUUID()}`;
await writeFile(tempPath, `${JSON.stringify(config, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600
});
await chmod(tempPath, 0o600);
await rename(tempPath, configPath);

console.log(
  JSON.stringify(
    {
      ok: true,
      pluginAllowed: config.plugins.allow.includes("life-memo"),
      pluginEnabled: config.plugins.entries["life-memo"].enabled,
      lifeToolAllowed: life.tools.allow.includes("life_files"),
      preservedDeny: requiredDeny.every((tool) => life.tools.deny.includes(tool)),
      workspaceOnly: life.tools.fs.workspaceOnly,
      ownerRoot
    },
    null,
    2
  )
);

import { readFile } from "node:fs/promises";

const configPath = "/Volume3/OpenClaw/home/.openclaw/openclaw.json";
const config = JSON.parse(await readFile(configPath, "utf8"));
const life = config.agents?.list?.find((agent) => agent.id === "life");
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

console.log(
  JSON.stringify(
    {
      pluginAllowed: config.plugins?.allow?.includes("life-memo") === true,
      pluginEnabled: config.plugins?.entries?.["life-memo"]?.enabled === true,
      lifeToolAllowed: life?.tools?.allow?.includes("life_files") === true,
      obsoleteLifeMemoRemoved:
        life?.tools?.allow?.includes("life_memo") !== true,
      denyPreserved: requiredDeny.every((tool) => life?.tools?.deny?.includes(tool)),
      workspaceOnly: life?.tools?.fs?.workspaceOnly === true,
      ownerRoot: config.plugins?.entries?.["life-memo"]?.config?.ownerRoot,
      lifeModel: life?.model?.primary,
      lifeWorkspace: life?.workspace
    },
    null,
    2
  )
);

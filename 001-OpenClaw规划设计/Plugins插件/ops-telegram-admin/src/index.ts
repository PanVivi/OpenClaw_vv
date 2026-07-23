import { execFile } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";

type JsonRecord = Record<string, unknown>;

const TOOL_NAME = "ops_telegram_admin";
const OPENCLAW = "/usr/local/sbin/openclaw";
const TARGETS = {
  coder: "步非煙",
  reviewer: "夏姬",
  "companion-dugu": "獨孤伽羅",
  "companion-wu": "武曌",
  "companion-lv": "呂雉"
} as const;
type TargetAgentId = keyof typeof TARGETS;

const ParamsSchema = Type.Object(
  {
    action: Type.Union([Type.Literal("status"), Type.Literal("configure")]),
    agent_id: Type.Optional(
      Type.Union([
        Type.Literal("coder"),
        Type.Literal("reviewer"),
        Type.Literal("companion-dugu"),
        Type.Literal("companion-wu"),
        Type.Literal("companion-lv")
      ])
    ),
    bot_token: Type.Optional(
      Type.String({
        minLength: 25,
        maxLength: 200,
        pattern: "^[0-9]{5,20}:[A-Za-z0-9_-]{20,}$"
      })
    )
  },
  { additionalProperties: false }
);

function result(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    details: value
  };
}

function requireTarget(value: unknown): TargetAgentId {
  if (typeof value !== "string" || !(value in TARGETS)) {
    throw new Error(`agent_id must be one of: ${Object.keys(TARGETS).join(", ")}`);
  }
  return value as TargetAgentId;
}

function requireToken(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9]{5,20}:[A-Za-z0-9_-]{20,}$/.test(value)
  ) {
    throw new Error("bot_token is missing or does not match Telegram token format");
  }
  return value;
}

function sanitize(message: string, token?: string): string {
  let clean = message;
  if (token) clean = clean.split(token).join("<redacted>");
  return clean.replace(/bot[0-9]{5,20}:[A-Za-z0-9_-]{20,}/g, "bot<redacted>");
}

async function runCli(args: string[], token?: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    execFile(
      OPENCLAW,
      args,
      {
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 4 * 1024 * 1024,
        env: process.env
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              sanitize(
                `${error.message}\n${stdout ?? ""}\n${stderr ?? ""}`.trim(),
                token
              )
            )
          );
          return;
        }
        resolve(String(stdout ?? ""));
      }
    );
  });
}

function parseJsonOutput<T>(output: string): T {
  const candidates: number[] = [];
  for (let index = 0; index < output.length; index += 1) {
    if (output[index] === "{" || output[index] === "[") candidates.push(index);
  }
  for (const index of candidates) {
    try {
      return JSON.parse(output.slice(index).trim()) as T;
    } catch {
      // Plugin startup notices may precede the CLI JSON; try the next opener.
    }
  }
  throw new Error("OpenClaw CLI returned no parseable JSON");
}

async function getBindings() {
  return parseJsonOutput<Array<{ agentId?: string; match?: JsonRecord }>>(
    await runCli(["agents", "bindings", "--json"])
  );
}

async function getAccounts() {
  return parseJsonOutput<JsonRecord>(
    await runCli(["config", "get", "channels.telegram.accounts"])
  );
}

async function getChannelStatus() {
  return parseJsonOutput<JsonRecord>(
    await runCli(["channels", "status", "--probe", "--json"])
  );
}

function accountStatus(status: JsonRecord, accountId: string): JsonRecord | undefined {
  const channelAccounts = status.channelAccounts as JsonRecord | undefined;
  const telegram = channelAccounts?.telegram;
  if (!Array.isArray(telegram)) return undefined;
  return telegram.find(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as JsonRecord).accountId === accountId
  ) as JsonRecord | undefined;
}

async function verifyTelegramToken(token: string): Promise<JsonRecord> {
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    signal: AbortSignal.timeout(15_000)
  });
  const payload = (await response.json()) as JsonRecord;
  if (!response.ok || payload.ok !== true || typeof payload.result !== "object") {
    throw new Error(`Telegram getMe rejected the supplied token (HTTP ${response.status})`);
  }
  const bot = payload.result as JsonRecord;
  return {
    id: bot.id,
    username: bot.username,
    first_name: bot.first_name
  };
}

function botIdFromAccount(entry: JsonRecord | undefined): string | undefined {
  const probe = entry?.probe as JsonRecord | undefined;
  const botInfo = probe?.botInfo as JsonRecord | undefined;
  const value = botInfo?.id;
  return typeof value === "number" || typeof value === "string"
    ? String(value)
    : undefined;
}

export default definePluginEntry({
  id: "ops-telegram-admin",
  name: "Ops Telegram Admin",
  description:
    "Constrained Telegram account and binding administration for the ops agent.",
  register(api) {
    const pluginConfig = (api.pluginConfig ?? {}) as JsonRecord;
    const allowedAgentId =
      typeof pluginConfig.agentId === "string" && pluginConfig.agentId.trim()
        ? pluginConfig.agentId.trim()
        : "ops";
    const ownerUserId =
      typeof pluginConfig.ownerUserId === "string"
        ? pluginConfig.ownerUserId.trim()
        : "";
    let operationQueue = Promise.resolve();

    const withLock = async <T>(operation: () => Promise<T>): Promise<T> => {
      let release: () => void = () => undefined;
      const previous = operationQueue;
      operationQueue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await operation();
      } finally {
        release();
      }
    };

    api.registerTool(
      (ctx) => {
        if (ctx.agentId !== allowedAgentId) return null;

        return {
          name: TOOL_NAME,
          label: "Ops Telegram Admin",
          description:
            "Inspect or configure Telegram accounts and account-scoped bindings only for coder, reviewer, companion-dugu, companion-wu, and companion-lv. Use action=status without a token. Use action=configure with the target agent_id and the owner-supplied Bot Token. The tool validates, backs up, writes a fixed 0600 secret, binds, validates, probes, and never returns the token.",
          parameters: ParamsSchema,
          async execute(_toolCallId, rawParams) {
            const params = rawParams as JsonRecord;
            let token: string | undefined;
            try {
              if (!ownerUserId) throw new Error("Plugin config ownerUserId is required");
              if (params.action === "status") {
                const [accounts, bindings, status] = await Promise.all([
                  getAccounts(),
                  getBindings(),
                  getChannelStatus()
                ]);
                const targets = Object.keys(TARGETS).map((agentId) => {
                  const account = accounts[agentId];
                  const binding = bindings.find(
                    (entry) =>
                      entry.agentId === agentId &&
                      entry.match?.channel === "telegram" &&
                      entry.match?.accountId === agentId
                  );
                  const runtime = accountStatus(status, agentId);
                  return {
                    agentId,
                    displayName: TARGETS[agentId as TargetAgentId],
                    accountConfigured:
                      typeof account === "object" && account !== null,
                    bindingConfigured: Boolean(binding),
                    running: runtime?.running === true,
                    connected: runtime?.connected === true,
                    probeOk: (runtime?.probe as JsonRecord | undefined)?.ok === true,
                    lastError:
                      typeof runtime?.lastError === "string"
                        ? runtime.lastError
                        : null
                  };
                });
                return result({ ok: true, targets });
              }
              if (params.action !== "configure") {
                throw new Error(`Unknown action: ${String(params.action)}`);
              }

              const target = requireTarget(params.agent_id);
              token = requireToken(params.bot_token);
              return await withLock(async () => {
                const [accountsBefore, bindingsBefore, statusBefore, telegramBot] =
                  await Promise.all([
                    getAccounts(),
                    getBindings(),
                    getChannelStatus(),
                    verifyTelegramToken(token!)
                  ]);

                if (typeof accountsBefore[target] === "object") {
                  throw new Error(
                    `Telegram account ${target} already exists; replacement is intentionally unsupported`
                  );
                }
                const conflictingBinding = bindingsBefore.find(
                  (entry) =>
                    entry.match?.channel === "telegram" &&
                    (entry.agentId === target || entry.match?.accountId === target)
                );
                if (conflictingBinding) {
                  throw new Error(
                    `A conflicting Telegram binding already exists for ${target}`
                  );
                }
                const newBotId = String(telegramBot.id);
                const duplicate = ["default", "housekeeper", "life"]
                  .map((accountId) => ({
                    accountId,
                    botId: botIdFromAccount(accountStatus(statusBefore, accountId))
                  }))
                  .find((entry) => entry.botId === newBotId);
                if (duplicate) {
                  throw new Error(
                    `This Bot Token is already used by Telegram account ${duplicate.accountId}`
                  );
                }

                const home = process.env.HOME ?? api.rootDir ?? ".";
                const configPath = join(home, ".openclaw", "openclaw.json");
                const secretsDir = join(home, ".openclaw", "secrets");
                const secretPath = join(secretsDir, `telegram-${target}.token`);
                const stamp = new Date().toISOString().replace(/[:.]/g, "");
                const backupDir = join(
                  home,
                  ".openclaw",
                  "backups",
                  `ops-telegram-admin-${stamp}`
                );
                const backupPath = join(backupDir, "openclaw.json");
                let secretCreated = false;

                await mkdir(backupDir, { recursive: true, mode: 0o700 });
                await chmod(backupDir, 0o700);
                await copyFile(configPath, backupPath);
                await chmod(backupPath, 0o600);

                try {
                  await mkdir(secretsDir, { recursive: true, mode: 0o700 });
                  await chmod(secretsDir, 0o700);
                  const temporarySecret = `${secretPath}.tmp-${process.pid}`;
                  await writeFile(temporarySecret, `${token}\n`, {
                    encoding: "utf8",
                    mode: 0o600,
                    flag: "wx"
                  });
                  await rename(temporarySecret, secretPath);
                  await chmod(secretPath, 0o600);
                  secretCreated = true;

                  await runCli(
                    [
                      "channels",
                      "add",
                      "--channel",
                      "telegram",
                      "--account",
                      target,
                      "--name",
                      TARGETS[target],
                      "--token-file",
                      secretPath
                    ],
                    token
                  );
                  const policyBatch = JSON.stringify([
                    {
                      path: `channels.telegram.accounts.${target}.enabled`,
                      value: true
                    },
                    {
                      path: `channels.telegram.accounts.${target}.dmPolicy`,
                      value: "allowlist"
                    },
                    {
                      path: `channels.telegram.accounts.${target}.allowFrom`,
                      value: [ownerUserId]
                    },
                    {
                      path: `channels.telegram.accounts.${target}.groupPolicy`,
                      value: "allowlist"
                    }
                  ]);
                  await runCli(["config", "set", "--batch-json", policyBatch], token);
                  await runCli(
                    [
                      "agents",
                      "bind",
                      "--agent",
                      target,
                      "--bind",
                      `telegram:${target}`,
                      "--json"
                    ],
                    token
                  );
                  await runCli(["config", "validate"], token);

                  let runtime: JsonRecord | undefined;
                  for (let attempt = 0; attempt < 8; attempt += 1) {
                    if (attempt > 0) {
                      await new Promise((resolve) => setTimeout(resolve, 2_000));
                    }
                    runtime = accountStatus(await getChannelStatus(), target);
                    if (
                      runtime?.running === true &&
                      (runtime.probe as JsonRecord | undefined)?.ok === true
                    ) {
                      break;
                    }
                  }
                  const runtimeBotId = botIdFromAccount(runtime);
                  if (
                    runtime?.running !== true ||
                    (runtime.probe as JsonRecord | undefined)?.ok !== true ||
                    runtimeBotId !== newBotId
                  ) {
                    throw new Error(
                      `Telegram account ${target} did not pass runtime probe`
                    );
                  }

                  return result({
                    ok: true,
                    configured: true,
                    agentId: target,
                    accountId: target,
                    displayName: TARGETS[target],
                    binding: `telegram:${target}`,
                    bot: telegramBot,
                    running: true,
                    probeOk: true,
                    secretStored: true,
                    secretMode: "0600",
                    backupDir
                  });
                } catch (error) {
                  const original = await readFile(backupPath);
                  const temporaryConfig = `${configPath}.rollback-${process.pid}`;
                  await writeFile(temporaryConfig, original, { mode: 0o600 });
                  await rename(temporaryConfig, configPath);
                  await chmod(configPath, 0o600);
                  if (secretCreated) await rm(secretPath, { force: true });
                  throw error;
                }
              });
            } catch (error) {
              const message = sanitize(
                error instanceof Error ? error.message : String(error),
                token
              );
              api.logger.warn(`ops-telegram-admin tool call failed: ${message}`);
              return result({ ok: false, error: message });
            }
          }
        };
      },
      { name: TOOL_NAME, optional: true }
    );
  }
});

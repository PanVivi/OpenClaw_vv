import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";

type JsonRecord = Record<string, unknown>;
const runFile = promisify(execFile);
const ParamsSchema = Type.Object({
  action: Type.Union([
    Type.Literal("status"), Type.Literal("plugins_list"), Type.Literal("cron_list"),
    Type.Literal("cron_get"), Type.Literal("tasks_list"), Type.Literal("task_get"),
    Type.Literal("doctor"), Type.Literal("file_sha256"), Type.Literal("log_tail")
  ]),
  id: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  path: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
  lines: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 }))
}, { additionalProperties: false });

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], details: value };
}
function required(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}
function within(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export default definePluginEntry({
  id: "ops-controlled-exec",
  name: "Ops Controlled Exec",
  description: "Fixed read-only operational capabilities for ops.",
  register(api) {
    const cfg = (api.pluginConfig ?? {}) as JsonRecord;
    const allowedAgentId = typeof cfg.agentId === "string" ? cfg.agentId : "ops";
    if (allowedAgentId !== "ops") throw new Error("ops-controlled-exec agentId must be ops");
    const stateDir = resolve(typeof cfg.stateDir === "string" ? cfg.stateDir : (process.env.OPENCLAW_STATE_DIR ?? "."));
    const configPath = resolve(typeof cfg.configPath === "string" ? cfg.configPath : (process.env.OPENCLAW_CONFIG_PATH ?? `${stateDir}/openclaw.json`));
    const openclawBin = typeof cfg.openclawBin === "string" ? cfg.openclawBin : "openclaw";
    const configuredRoots = Array.isArray(cfg.allowedRoots) ? cfg.allowedRoots.filter((v): v is string => typeof v === "string") : [stateDir];
    const roots = configuredRoots.map((v) => resolve(v));

    async function run(args: string[]) {
      const { stdout, stderr } = await runFile(openclawBin, args, {
        shell: false, timeout: 30_000, maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, OPENCLAW_STATE_DIR: stateDir, OPENCLAW_CONFIG_PATH: configPath }
      });
      return { stdout: stdout.trim(), stderr: stderr.trim() || undefined };
    }
    async function safePath(input: string) {
      const absolute = resolve(input);
      if (!roots.some((root) => within(root, absolute))) throw new Error("path is outside configured read-only roots");
      const target = await realpath(absolute);
      if (!roots.some((root) => within(root, target))) throw new Error("resolved path escaped configured roots");
      const info = await lstat(target);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error("target must be a regular non-symlink file");
      return target;
    }

    api.registerTool((ctx) => {
      if (ctx.agentId !== allowedAgentId) return null;
      return {
        name: "ops_controlled_exec",
        label: "Ops Controlled Exec",
        description: "Read OpenClaw status, plugins, Cron, Tasks, doctor output, file checksums and bounded logs through fixed schemas. No arbitrary command, write, restart, delete or config mutation.",
        parameters: ParamsSchema,
        async execute(_id: string, raw: unknown) {
          const p = raw as JsonRecord;
          try {
            const commandMap: Record<string, string[]> = {
              status: ["status", "--json"], plugins_list: ["plugins", "list", "--json"],
              cron_list: ["cron", "list", "--json"], tasks_list: ["tasks", "list", "--json"],
              doctor: ["doctor", "--json"]
            };
            if (typeof p.action === "string" && commandMap[p.action]) return result({ ok: true, action: p.action, ...(await run(commandMap[p.action])) });
            if (p.action === "cron_get") return result({ ok: true, action: p.action, ...(await run(["cron", "get", required(p.id, "id"), "--json"])) });
            if (p.action === "task_get") return result({ ok: true, action: p.action, ...(await run(["tasks", "get", required(p.id, "id"), "--json"])) });
            if (p.action === "file_sha256") {
              const target = await safePath(required(p.path, "path"));
              const digest = createHash("sha256").update(await readFile(target)).digest("hex");
              return result({ ok: true, action: p.action, path: target, sha256: digest });
            }
            if (p.action === "log_tail") {
              const target = await safePath(required(p.path, "path"));
              const count = typeof p.lines === "number" ? p.lines : 100;
              const handle = await open(target, "r");
              try {
                const info = await handle.stat();
                const bytes = Math.min(info.size, 256 * 1024);
                const buffer = Buffer.alloc(bytes);
                await handle.read(buffer, 0, bytes, info.size - bytes);
                const selected = buffer.toString("utf8").split(/\r?\n/).slice(-count).join("\n");
                return result({ ok: true, action: p.action, path: target, lines: selected });
              } finally { await handle.close(); }
            }
            throw new Error(`unknown action: ${String(p.action)}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            api.logger.warn(`ops_controlled_exec rejected: ${message}`);
            return result({ ok: false, error: message });
          }
        }
      };
    }, { name: "ops_controlled_exec", optional: true });
  }
});

import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";
const TOOL_NAME = "ops_token_inbox";
const TOKEN_PATTERN = /\b[0-9]{5,20}:[A-Za-z0-9_-]{20,}\b/g;
const TARGETS = [
    "ops",
    "housekeeper",
    "life",
    "coder",
    "reviewer",
    "companion-dugu",
    "companion-wu",
    "companion-lv"
];
const ParamsSchema = Type.Object({
    action: Type.Union([
        Type.Literal("list"),
        Type.Literal("claim"),
        Type.Literal("discard")
    ]),
    capture_id: Type.Optional(Type.String({ minLength: 8, maxLength: 100 })),
    agent_id: Type.Optional(Type.Union(TARGETS.map((target) => Type.Literal(target))))
}, { additionalProperties: false });
function toolResult(value) {
    return {
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
        details: value
    };
}
function senderMatches(value, ownerUserId) {
    return value === ownerUserId || value.endsWith(`:${ownerUserId}`);
}
export default definePluginEntry({
    id: "ops-token-intake",
    name: "Ops Token Intake",
    description: "Capture owner-supplied Telegram Bot Tokens before redaction and give ops opaque token-file handles.",
    register(api) {
        const pluginConfig = (api.pluginConfig ?? {});
        const allowedAgentId = typeof pluginConfig.agentId === "string" && pluginConfig.agentId.trim()
            ? pluginConfig.agentId.trim()
            : "ops";
        const allowedAccountId = typeof pluginConfig.accountId === "string" && pluginConfig.accountId.trim()
            ? pluginConfig.accountId.trim()
            : "default";
        const ownerUserId = typeof pluginConfig.ownerUserId === "string"
            ? pluginConfig.ownerUserId.trim()
            : "";
        const baseDir = join(process.env.HOME ?? api.rootDir ?? ".", ".openclaw", "secrets", "telegram-inbox");
        const statePath = join(baseDir, "index.json");
        const fileLockPath = `${statePath}.lock`;
        let stateQueue = Promise.resolve();
        const readState = async () => {
            try {
                const value = JSON.parse(await readFile(statePath, "utf8"));
                return value?.version === 1 && Array.isArray(value.captures)
                    ? value
                    : { version: 1, captures: [] };
            }
            catch (error) {
                if (error.code === "ENOENT") {
                    return { version: 1, captures: [] };
                }
                throw error;
            }
        };
        const writeState = async (state) => {
            await mkdir(dirname(statePath), { recursive: true, mode: 0o700 });
            await chmod(dirname(statePath), 0o700);
            const temporaryPath = `${statePath}.tmp-${process.pid}-${randomUUID()}`;
            await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
                encoding: "utf8",
                mode: 0o600
            });
            await rename(temporaryPath, statePath);
            await chmod(statePath, 0o600);
        };
        const withStateLock = async (operation) => {
            let release = () => undefined;
            const previous = stateQueue;
            stateQueue = new Promise((resolve) => {
                release = resolve;
            });
            await previous;
            try {
                await mkdir(baseDir, { recursive: true, mode: 0o700 });
                let acquired = false;
                for (let attempt = 0; attempt < 80; attempt += 1) {
                    try {
                        await mkdir(fileLockPath);
                        acquired = true;
                        break;
                    }
                    catch (error) {
                        if (error.code !== "EEXIST")
                            throw error;
                        await new Promise((resolve) => setTimeout(resolve, 25));
                    }
                }
                if (!acquired)
                    throw new Error("Timed out acquiring ops token inbox lock");
                try {
                    return await operation();
                }
                finally {
                    await rm(fileLockPath, { recursive: true, force: true });
                }
            }
            finally {
                release();
            }
        };
        api.on("message_received", async (event, ctx) => {
            if (!ownerUserId ||
                ctx.channelId !== "telegram" ||
                ctx.accountId !== allowedAccountId ||
                !senderMatches(event.from, ownerUserId)) {
                return;
            }
            const tokens = event.content.match(TOKEN_PATTERN) ?? [];
            for (const token of new Set(tokens)) {
                try {
                    await withStateLock(async () => {
                        const state = await readState();
                        const fingerprint = createHash("sha256").update(token).digest("hex");
                        if (state.captures.some((capture) => capture.fingerprint === fingerprint)) {
                            return;
                        }
                        const id = randomUUID();
                        const tokenFile = join(baseDir, `${id}.token`);
                        await mkdir(baseDir, { recursive: true, mode: 0o700 });
                        await chmod(baseDir, 0o700);
                        const temporaryPath = `${tokenFile}.tmp-${process.pid}-${randomUUID()}`;
                        await writeFile(temporaryPath, `${token}\n`, {
                            encoding: "utf8",
                            mode: 0o600,
                            flag: "wx"
                        });
                        await rename(temporaryPath, tokenFile);
                        await chmod(tokenFile, 0o600);
                        state.captures.push({
                            id,
                            fingerprint: fingerprint.slice(0, 12),
                            tokenFile,
                            status: "unclaimed",
                            createdAt: new Date().toISOString()
                        });
                        await writeState(state);
                        api.logger.info(`captured owner Telegram credential as opaque handle ${id}`);
                    });
                }
                catch (error) {
                    api.logger.error(`ops token intake capture failed without exposing the credential: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });
        api.registerTool((ctx) => {
            if (ctx.agentId !== allowedAgentId)
                return null;
            return {
                name: TOOL_NAME,
                label: "Ops Token Inbox",
                description: "List, claim, or discard owner-supplied Telegram Bot Tokens captured before redaction. Never asks the owner to resend a token that appears in this inbox and never reads or returns token contents. claim returns a 0600 tokenFile path for native OpenClaw channels add/configuration.",
                parameters: ParamsSchema,
                async execute(_toolCallId, rawParams) {
                    const params = rawParams;
                    try {
                        return await withStateLock(async () => {
                            const state = await readState();
                            if (params.action === "list") {
                                return toolResult({
                                    ok: true,
                                    captures: state.captures.map(({ fingerprint, ...capture }) => capture)
                                });
                            }
                            const captureId = typeof params.capture_id === "string"
                                ? params.capture_id.trim()
                                : "";
                            if (!captureId)
                                throw new Error("capture_id is required");
                            const capture = state.captures.find((candidate) => candidate.id === captureId);
                            if (!capture)
                                throw new Error(`Capture not found: ${captureId}`);
                            if (params.action === "discard") {
                                await rm(capture.tokenFile, { force: true });
                                state.captures = state.captures.filter((candidate) => candidate.id !== captureId);
                                await writeState(state);
                                return toolResult({ ok: true, discarded: captureId });
                            }
                            if (params.action !== "claim") {
                                throw new Error(`Unknown action: ${String(params.action)}`);
                            }
                            if (typeof params.agent_id !== "string" ||
                                !TARGETS.includes(params.agent_id)) {
                                throw new Error(`agent_id must be one of: ${TARGETS.join(", ")}`);
                            }
                            if (capture.status === "claimed" && capture.agentId !== params.agent_id) {
                                throw new Error(`Capture is already claimed by ${capture.agentId ?? "another agent"}`);
                            }
                            capture.status = "claimed";
                            capture.agentId = params.agent_id;
                            capture.claimedAt = new Date().toISOString();
                            await writeState(state);
                            return toolResult({
                                ok: true,
                                captureId: capture.id,
                                agentId: capture.agentId,
                                tokenFile: capture.tokenFile,
                                mode: "0600",
                                instruction: "Use this file with native OpenClaw tokenFile/channels add. Do not read, echo, copy into command arguments, logs, transcripts, or memory."
                            });
                        });
                    }
                    catch (error) {
                        return toolResult({
                            ok: false,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                }
            };
        }, { name: TOOL_NAME, optional: true });
    }
});

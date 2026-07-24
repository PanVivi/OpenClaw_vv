import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";
const START_TOOL_NAME = "housekeeper_workboard_start";
const SHOW_TOOL_NAME = "housekeeper_workboard_show";
const ParamsSchema = Type.Object({
    board_id: Type.Optional(Type.String({
        minLength: 1,
        maxLength: 100,
        pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$"
    }))
}, { additionalProperties: false });
const ShowParamsSchema = Type.Object({
    card_id: Type.String({
        minLength: 36,
        maxLength: 36,
        pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    })
}, { additionalProperties: false });
function toolResult(value) {
    return {
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
        details: value
    };
}
export function buildDispatchArgs(params) {
    const args = ["workboard", "dispatch", "--json"];
    if (typeof params.board_id === "string" && params.board_id.trim()) {
        args.push("--board", params.board_id.trim());
    }
    return args;
}
export function buildShowArgs(params) {
    return ["workboard", "show", String(params.card_id), "--json"];
}
export function resolveCliInvocation() {
    const cliEntry = process.env.OPENCLAW_CLI_PATH?.trim() || process.argv[1];
    if (cliEntry) {
        return { command: process.execPath, prefix: [cliEntry] };
    }
    return { command: "openclaw", prefix: [] };
}
const plugin = definePluginEntry({
    id: "housekeeper-workboard-control",
    name: "Housekeeper Workboard Control",
    description: "Trigger the official Workboard dispatcher without granting housekeeper general exec.",
    register(api) {
        const pluginConfig = (api.pluginConfig ?? {});
        const allowedAgentId = typeof pluginConfig.agentId === "string" && pluginConfig.agentId.trim()
            ? pluginConfig.agentId.trim()
            : "housekeeper";
        const configuredTimeoutMs = Number(pluginConfig.timeoutMs ?? 30_000);
        const timeoutMs = Number.isInteger(configuredTimeoutMs) &&
            configuredTimeoutMs >= 5_000 &&
            configuredTimeoutMs <= 60_000
            ? configuredTimeoutMs
            : 30_000;
        const executeCli = async (args) => {
            try {
                const invocation = resolveCliInvocation();
                const result = await api.runtime.system.runCommandWithTimeout([invocation.command, ...invocation.prefix, ...args], { timeoutMs });
                const stdout = result.stdout?.trim() ?? "";
                const stderr = result.stderr?.trim() ?? "";
                let output = stdout;
                if (stdout) {
                    try {
                        output = JSON.parse(stdout);
                    }
                    catch {
                        output = stdout;
                    }
                }
                const ok = result.code === 0 && result.termination === "exit";
                return toolResult({
                    ok,
                    code: result.code,
                    termination: result.termination ?? null,
                    output,
                    stderr: stderr || undefined
                });
            }
            catch (error) {
                return toolResult({
                    ok: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        };
        api.registerTool((ctx) => {
            if (ctx.agentId !== allowedAgentId)
                return null;
            return {
                name: START_TOOL_NAME,
                label: "Start Ready Workboard Tasks",
                description: "Start ready Workboard cards through the official Gateway dispatcher. Create/specify/decompose cards first. This tool owns no task state and cannot run arbitrary commands.",
                parameters: ParamsSchema,
                async execute(_toolCallId, rawParams) {
                    return executeCli(buildDispatchArgs(rawParams));
                }
            };
        }, { name: START_TOOL_NAME, optional: true });
        api.registerTool((ctx) => {
            if (ctx.agentId !== allowedAgentId)
                return null;
            return {
                name: SHOW_TOOL_NAME,
                label: "Read Workboard Card",
                description: "Read one Workboard card by UUID through the official CLI. This is read-only and exposes no arbitrary command, path, or file access.",
                parameters: ShowParamsSchema,
                async execute(_toolCallId, rawParams) {
                    return executeCli(buildShowArgs(rawParams));
                }
            };
        }, { name: SHOW_TOOL_NAME, optional: true });
    }
});
export default plugin;

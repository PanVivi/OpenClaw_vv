import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";

type JsonRecord = Record<string, unknown>;
const START_TOOL_NAME = "housekeeper_workboard_start";
const SHOW_TOOL_NAME = "housekeeper_workboard_show";

const ParamsSchema = Type.Object({}, { additionalProperties: false });

const ShowParamsSchema = Type.Object({
  card_id: Type.String({ minLength: 36, maxLength: 36, pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" })
}, { additionalProperties: false });

function toolResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], details: value };
}

export function buildGatewayRequest(kind: "dispatch" | "show", params: JsonRecord, managedBoardId = "task-system") {
  if (kind === "dispatch") {
    return { method: "workboard.cards.dispatch", params: { boardId: managedBoardId } };
  }
  return { method: "workboard.cards.runs", params: { id: String(params.card_id) } };
}

const plugin: ReturnType<typeof definePluginEntry> = definePluginEntry({
  id: "housekeeper-workboard-control",
  name: "Housekeeper Workboard Control",
  description: "Use in-process Gateway RPC to dispatch or inspect official Workboard cards without general exec.",
  register(api) {
    const pluginConfig = (api.pluginConfig ?? {}) as JsonRecord;
    const allowedAgentId = typeof pluginConfig.agentId === "string" && pluginConfig.agentId.trim() ? pluginConfig.agentId.trim() : "housekeeper";
    const managedBoardId = typeof pluginConfig.boardId === "string" && pluginConfig.boardId.trim() ? pluginConfig.boardId.trim() : "task-system";
    const configuredTimeoutMs = Number(pluginConfig.timeoutMs ?? 30_000);
    const timeoutMs = Number.isInteger(configuredTimeoutMs) && configuredTimeoutMs >= 5_000 && configuredTimeoutMs <= 60_000 ? configuredTimeoutMs : 30_000;

    const request = async (kind: "dispatch" | "show", params: JsonRecord) => {
      try {
        if (!api.runtime.gateway.isAvailable()) throw new Error("Gateway 内部接口暂不可用");
        const call = buildGatewayRequest(kind, params, managedBoardId);
        const output = await api.runtime.gateway.request(call.method, call.params, { timeoutMs });
        return toolResult({ ok: true, output });
      } catch (error) {
        return toolResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    };

    api.registerTool((ctx) => {
      if (ctx.agentId !== allowedAgentId) return null;
      return {
        name: START_TOOL_NAME,
        label: "启动已就绪事务",
        description: "通过 Gateway 内部接口只启动独立受管工作板中已经完成目标、验收标准、依赖和责任人登记的事项。不会派发历史 production 卡，也不执行任意命令；新任务应优先使用 task_intake。",
        parameters: ParamsSchema,
        async execute(_toolCallId: string, rawParams: unknown) { return request("dispatch", rawParams as JsonRecord); }
      };
    }, { name: START_TOOL_NAME, optional: true });

    api.registerTool((ctx) => {
      if (ctx.agentId !== allowedAgentId) return null;
      return {
        name: SHOW_TOOL_NAME,
        label: "查看事务实况",
        description: "只读查看一项 Workboard 事项及其真实执行尝试，不提供任意命令、路径或文件访问。",
        parameters: ShowParamsSchema,
        async execute(_toolCallId: string, rawParams: unknown) { return request("show", rawParams as JsonRecord); }
      };
    }, { name: SHOW_TOOL_NAME, optional: true });
  }
});

export default plugin;

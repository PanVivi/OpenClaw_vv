import { definePluginEntry } from "openclaw/plugin-sdk/core";

export default definePluginEntry({
  id: "housekeeper-async-dispatch",
  name: "Housekeeper Async Dispatch",
  description:
    "Keep housekeeper conversations responsive by making cross-session delegation fire-and-forget.",
  register(api) {
    api.on(
      "before_tool_call",
      (event, ctx) => {
        if (ctx.agentId !== "housekeeper" || event.toolName !== "sessions_send") {
          return;
        }

        if (event.params.timeoutSeconds === 0) {
          return;
        }

        api.logger.info(
          `rewrote housekeeper sessions_send to fire-and-forget (session=${ctx.sessionKey ?? "unknown"})`,
        );

        return {
          params: {
            ...event.params,
            timeoutSeconds: 0,
          },
        };
      },
      { priority: 100 },
    );
  },
});

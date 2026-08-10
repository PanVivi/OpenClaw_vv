import assert from "node:assert/strict";
import plugin, { buildGatewayRequest } from "../dist/index.js";

assert.deepEqual(buildGatewayRequest("dispatch", {}), { method: "workboard.cards.dispatch", params: { boardId: "task-system" } });
assert.deepEqual(buildGatewayRequest("dispatch", {}, "managed-repair"), { method: "workboard.cards.dispatch", params: { boardId: "managed-repair" } });
assert.deepEqual(buildGatewayRequest("show", { card_id: "1606d140-e7e8-4e3d-842b-b251c3f498d2" }), { method: "workboard.cards.runs", params: { id: "1606d140-e7e8-4e3d-842b-b251c3f498d2" } });

const factories = new Map();
const calls = [];
plugin.register({
  pluginConfig: { agentId: "housekeeper", boardId: "task-system", timeoutMs: 15000 },
  runtime: { gateway: {
    isAvailable() { return true; },
    async request(method, params, options) { calls.push({ method, params, options }); return { cards: [], started: [] }; }
  } },
  registerTool(factory, options) { factories.set(options.name, factory); }
});

assert.equal(factories.get("housekeeper_workboard_start")({ agentId: "life" }), null);
const start = factories.get("housekeeper_workboard_start")({ agentId: "housekeeper" });
const result = await start.execute("1", {});
assert.equal(result.details.ok, true);
assert.deepEqual(calls[0], { method: "workboard.cards.dispatch", params: { boardId: "task-system" }, options: { timeoutMs: 15000 } });
console.log("HOUSEKEEPER_WORKBOARD_CONTROL_TEST_OK");

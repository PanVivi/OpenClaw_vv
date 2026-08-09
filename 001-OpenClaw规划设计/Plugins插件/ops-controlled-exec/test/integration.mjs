import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin from "../dist/index.js";

const root = await mkdtemp(join(tmpdir(), "ops-controlled-"));
let toolFactory;
const api = {
  pluginConfig: { agentId: "ops", stateDir: root, configPath: join(root, "openclaw.json"), allowedRoots: [root], openclawBin: process.execPath },
  logger: { warn() {} }, registerTool(factory) { toolFactory = factory; }
};
try {
  await writeFile(join(root, "sample.log"), "one\ntwo\nthree\n", "utf8");
  plugin.register(api);
  assert.equal(toolFactory({ agentId: "life" }), null);
  const tool = toolFactory({ agentId: "ops" });
  const hash = await tool.execute("1", { action: "file_sha256", path: join(root, "sample.log") });
  assert.equal(hash.details.ok, true);
  assert.match(hash.details.sha256, /^[a-f0-9]{64}$/);
  const tail = await tool.execute("2", { action: "log_tail", path: join(root, "sample.log"), lines: 2 });
  assert.match(tail.details.lines, /three/);
  const escaped = await tool.execute("3", { action: "file_sha256", path: join(root, "..", "outside") });
  assert.equal(escaped.details.ok, false);
  assert.equal("command" in tool.parameters.properties, false);
  console.log("OPS_CONTROLLED_EXEC_TEST_OK");
} finally { await rm(root, { recursive: true, force: true }); }

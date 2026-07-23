import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin from "../dist/index.js";

const root = await mkdtemp(join(tmpdir(), "ops-token-intake-"));
const originalHome = process.env.HOME;
process.env.HOME = root;
const hooks = new Map();
let toolFactory;
const api = {
  rootDir: root,
  pluginConfig: {
    agentId: "ops",
    accountId: "default",
    ownerUserId: "811150402"
  },
  logger: { info() {}, warn() {}, error() {} },
  on(name, handler) {
    hooks.set(name, handler);
  },
  registerTool(factory) {
    toolFactory = factory;
  }
};

try {
  plugin.register(api);
  const token = `123456:${"A".repeat(32)}`;
  await hooks.get("message_received")(
    { from: "telegram:811150402", content: `绑定 coder ${token}` },
    { channelId: "telegram", accountId: "default" }
  );

  const statePath = join(
    root,
    ".openclaw",
    "secrets",
    "telegram-inbox",
    "index.json"
  );
  const stateText = await readFile(statePath, "utf8");
  assert.equal(stateText.includes(token), false, "state must not contain token");
  const state = JSON.parse(stateText);
  assert.equal(state.captures.length, 1);
  const capture = state.captures[0];
  if (process.platform !== "win32") {
    assert.equal((await stat(capture.tokenFile)).mode & 0o777, 0o600);
  }
  assert.equal((await readFile(capture.tokenFile, "utf8")).trim(), token);

  const tool = toolFactory({ agentId: "ops" });
  const listed = await tool.execute("test-list", { action: "list" });
  const listedText = listed.content[0].text;
  assert.equal(listedText.includes(token), false);
  assert.equal(listedText.includes(capture.fingerprint), false);

  const claimed = await tool.execute("test-claim", {
    action: "claim",
    capture_id: capture.id,
    agent_id: "coder"
  });
  assert.equal(claimed.details.ok, true);
  assert.equal(claimed.details.tokenFile, capture.tokenFile);
  assert.equal(JSON.stringify(claimed).includes(token), false);

  const token2 = `223456:${"B".repeat(32)}`;
  const token3 = `323456:${"C".repeat(32)}`;
  await Promise.all(
    [token2, token3].map((candidate) =>
      hooks.get("message_received")(
        { from: "telegram:811150402", content: candidate },
        { channelId: "telegram", accountId: "default" }
      )
    )
  );
  const concurrentState = JSON.parse(await readFile(statePath, "utf8"));
  assert.equal(concurrentState.captures.length, 3);
  assert.equal((await readFile(statePath, "utf8")).includes(token2), false);
  assert.equal((await readFile(statePath, "utf8")).includes(token3), false);

  console.log("OPS_TOKEN_INTAKE_TEST_OK");
} finally {
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  await rm(root, { recursive: true, force: true });
}

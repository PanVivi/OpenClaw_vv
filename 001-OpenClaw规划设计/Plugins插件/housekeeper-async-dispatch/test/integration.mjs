import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin, { buildStallAlertMessage } from "../dist/index.js";

const root = await mkdtemp(join(tmpdir(), "housekeeper-watch-"));
const originalHome = process.env.HOME;
process.env.HOME = root;
const hooks = new Map();
let toolFactory;
const api = {
  rootDir: root,
  pluginConfig: {
    agentId: "housekeeper",
    ownerChatId: "811150402",
    stallMinutes: 10
  },
  runtime: { subagent: { async run() { return { runId: "test" }; } } },
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
  const before = await hooks.get("before_tool_call")(
    {
      toolName: "sessions_send",
      params: {
        agentId: "ops",
        timeoutSeconds: 120,
        message: "**Task ID:** TEST-001\n执行只读检查"
      }
    },
    {
      agentId: "housekeeper",
      sessionKey: "agent:housekeeper:telegram:direct:811150402"
    }
  );
  assert.equal(before.params.timeoutSeconds, 0);

  const statePath = join(
    root,
    ".openclaw",
    "housekeeper-async-dispatch",
    "tasks.json"
  );
  const state = JSON.parse(await readFile(statePath, "utf8"));
  assert.equal(state.tasks[0].taskId, "TEST-001");
  assert.equal(state.tasks[0].target, "ops");
  assert.equal(state.tasks[0].status, "waiting");

  await hooks.get("before_agent_start")(
    {
      prompt:
        "[Inter-session message] sourceSession=agent:ops:task:TEST-001 sourceTool=sessions_send isUser=false\n**Task ID:** TEST-001\nStatus: completed\n本任务完成"
    },
    {
      agentId: "housekeeper",
      sessionKey: "agent:housekeeper:telegram:direct:811150402"
    }
  );
  const completedState = JSON.parse(await readFile(statePath, "utf8"));
  assert.equal(completedState.tasks[0].status, "completed");

  await Promise.all(
    ["TEST-002", "TEST-003", "TEST-004"].map((taskId) =>
      hooks.get("before_tool_call")(
        {
          toolName: "sessions_send",
          params: {
            agentId: "ops",
            timeoutSeconds: 120,
            message: `**Task ID:** ${taskId}\n并发状态写入测试`
          }
        },
        {
          agentId: "housekeeper",
          sessionKey: "agent:housekeeper:telegram:direct:811150402"
        }
      )
    )
  );
  const concurrentState = JSON.parse(await readFile(statePath, "utf8"));
  assert.deepEqual(
    new Set(concurrentState.tasks.map((task) => task.taskId)),
    new Set(["TEST-001", "TEST-002", "TEST-003", "TEST-004"])
  );

  const tool = toolFactory({ agentId: "housekeeper" });
  const updated = await tool.execute("test-update", {
    action: "update",
    task_id: "TEST-001",
    status: "completed",
    note: "verified"
  });
  assert.equal(updated.details.ok, true);
  assert.equal(updated.details.task.status, "completed");
  const alertMessage = buildStallAlertMessage({
    taskId: "TEST-ALERT",
    target: "agent:ops:task:TEST-ALERT",
    sourceSessionKey: "agent:housekeeper:telegram:direct:811150402",
    status: "progress",
    dispatchedAt: "2026-07-23T00:00:00.000Z",
    lastUpdateAt: "2026-07-23T00:00:00.000Z",
    dueAt: "2026-07-23T00:02:00.000Z",
    alertCount: 0,
    note: "validation"
  });
  assert.match(alertMessage, /does NOT prove/i);
  assert.match(alertMessage, /unknown execution state/i);
  assert.match(alertMessage, /automatic watchdog alert/i);
  console.log("HOUSEKEEPER_WATCH_TEST_OK");
} finally {
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  await rm(root, { recursive: true, force: true });
}

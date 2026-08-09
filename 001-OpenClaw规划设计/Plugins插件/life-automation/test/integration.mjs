import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = await mkdtemp(join(tmpdir(), "life-automation-"));
const registrations = [];
const api = {
  rootDir: root,
  pluginConfig: {
    agentId: "life",
    timezone: "Asia/Taipei",
    ownerChatId: "811150402",
    telegramAccountId: "life"
  },
  logger: { info() {}, warn() {}, error() {} },
  registerTool(factory, metadata) { registrations.push({ factory, metadata }); },
  on() {},
  runtime: {
    subagent: {
      async run() { return { runId: "unused" }; },
      async waitForRun() { return { status: "ok" }; }
    }
  }
};

try {
  const plugin = (await import("../dist/index.js")).default;
  plugin.register(api);
  const registration = registrations.find((item) => item.metadata.name === "life_automation");
  const tool = registration.factory({ agentId: "life" });
  const created = await tool.execute("create", {
    action: "create",
    task_id: "update-at-regression",
    name: "一次性时间更新回归",
    prompt: "测试",
    schedule_kind: "at",
    at: "2099-08-10T09:15:00+08:00",
    enabled: true,
    notify_owner: false
  });
  assert.equal(created.details.ok, true);
  const updated = await tool.execute("update", {
    action: "update",
    job_id: "life-automation-update-at-regression",
    at: "2099-08-10T08:15:00+08:00"
  });
  assert.equal(updated.details.ok, true);
  assert.equal(updated.details.job.schedule.kind, "at");
  assert.equal(updated.details.job.schedule.at, "2099-08-10T08:15:00+08:00");
  assert.equal(updated.details.job.nextRunAt, "2099-08-10T00:15:00.000Z");
  console.log("LIFE_AUTOMATION_UPDATE_AT_OK");
} finally {
  await rm(root, { recursive: true, force: true });
}

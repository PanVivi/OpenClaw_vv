#!/usr/bin/env node

import { appendFile, mkdir, readFile, rm, rmdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const execFileAsync = promisify(execFile);
const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const UUID_GLOBAL_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

const config = {
  node:
    process.env.WORKBOARD_OPENCLAW_NODE ??
    "/Volume3/@apps/openclaw/node/bin/node",
  cli:
    process.env.WORKBOARD_OPENCLAW_CLI ??
    "/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs",
  subscriptionId:
    process.env.WORKBOARD_SUBSCRIPTION_ID ??
    "9fb9d472-1880-4170-ba9e-1aa333d24696",
  telegramAccount:
    process.env.WORKBOARD_TELEGRAM_ACCOUNT ?? "housekeeper",
  telegramTarget:
    process.env.WORKBOARD_TELEGRAM_TARGET ?? "811150402",
  limit: Number.parseInt(process.env.WORKBOARD_NOTIFICATION_LIMIT ?? "20", 10),
  auditPath:
    process.env.WORKBOARD_RELAY_AUDIT_PATH ??
    "/Volume3/OpenClaw/home/.openclaw/automation/workboard-notification-relay.jsonl",
  lockPath:
    process.env.WORKBOARD_RELAY_LOCK_PATH ??
    "/Volume3/OpenClaw/home/.openclaw/automation/workboard-notification-relay.lock"
};

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error.message}`);
  }
}

async function runCli(args) {
  const { stdout } = await execFileAsync(config.node, [config.cli, ...args], {
    env: {
      ...process.env,
      HOME: process.env.HOME ?? "/Volume3/OpenClaw/home"
    },
    maxBuffer: 2 * 1024 * 1024,
    timeout: 45_000,
    windowsHide: true
  });
  return parseJson(stdout, args.join(" "));
}

async function gatewayCall(method, params) {
  return runCli([
    "gateway",
    "call",
    method,
    "--params",
    JSON.stringify(params),
    "--json"
  ]);
}

function extractCardId(event) {
  for (const value of [
    event?.cardId,
    event?.card_id,
    event?.card?.id,
    event?.runId,
    event?.run_id,
    event?.sessionKey,
    event?.session_key,
    event?.message
  ]) {
    if (typeof value !== "string") continue;
    const match = value.match(UUID_RE);
    if (match) return match[0].toLowerCase();
  }
  return undefined;
}

function oneLine(value, fallback = "无") {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

const INTERNAL_CONTROL_WORDS = new Set([
  "ANNOUNCE_SKIP",
  "REPLY_SKIP",
  "NO_REPLY"
]);

function isInternalControlOnly(value) {
  if (typeof value !== "string") return false;
  return INTERNAL_CONTROL_WORDS.has(value.trim());
}

function humanizeTitle(value) {
  const cleaned = oneLine(value, "这件事")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(UUID_GLOBAL_RE, "")
    .replace(/[【\[]?(?:受控)?(?:模拟)?(?:验收|测试)[】\]]?/g, "")
    .replace(/\bWorkboard\b/gi, "任务")
    .replace(/\bRelay\b/gi, "通知")
    .replace(/\bcompleted\b/gi, "完成")
    .replace(/\b(?:done|success)\b/gi, "完成")
    .replace(/端到端/g, "全程")
    .replace(/\b20\d{6}(?:[-_T]?\d{4,6})?\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:：\-—]+|[\s:：\-—]+$/g, "")
    .trim();
  return (cleaned || "这件事").slice(0, 60);
}

function humanizeReason(row) {
  const source = `${row?.event?.kind ?? ""} ${row?.status ?? ""} ${
    row?.detail ?? ""
  }`.toLowerCase();
  if (/quota|rate.?limit|billing|额度|余额/.test(source)) {
    return "所用模型额度已尽，当前不能继续";
  }
  if (/permission|forbidden|denied|eacces|eperm|权限/.test(source)) {
    return "当前权限不足";
  }
  if (/auth|token|credential|unauthorized|凭据|认证/.test(source)) {
    return "凭据没有通过";
  }
  if (
    /network|econn|enotfound|socket|connection|fetch failed|网络|连接/.test(
      source
    )
  ) {
    return "网络没有连通";
  }
  if (/timeout|timed out|expired|stale|超时|失联/.test(source)) {
    return "超过了约定时限";
  }
  if (/dependency|prerequisite|前置|依赖/.test(source)) {
    return "前置条件还没有满足";
  }
  return "执行没有顺利完成，原始原因已留档";
}

function outcomeKind(row) {
  const source = `${row?.event?.kind ?? ""} ${row?.status ?? ""}`.toLowerCase();
  if (/\b(cancelled|canceled)\b/.test(source)) return "cancelled";
  if (/\b(stale|timeout|timedout|expired)\b/.test(source)) return "stale";
  if (/\b(blocked|waiting_input)\b/.test(source)) return "blocked";
  if (/\b(failed|failure|error)\b/.test(source)) return "failed";
  if (/\b(completed|complete|done|success|succeeded)\b/.test(source)) {
    return "completed";
  }
  return "updated";
}

function buildMessage(rows) {
  return rows
    .map((row) => {
      const title = humanizeTitle(row.title);
      switch (outcomeKind(row)) {
        case "completed":
          return `少主，本宫盯着的「${title}」已经办妥。`;
        case "failed":
          return `少主，「${title}」没办成，本宫已经按住了。缘故：${humanizeReason(
            row
          )}。`;
        case "blocked":
          return `少主，「${title}」卡住了，本宫已经叫停。缘故：${humanizeReason(
            row
          )}。`;
        case "stale":
          return `少主，「${title}」迟迟没有回话，本宫已把它按停，免得空耗。`;
        case "cancelled":
          return `少主，「${title}」已经停下，本宫不会让它继续乱跑。`;
        default:
          return `少主，「${title}」有了新回报，本宫已经记下；细账留在案中。`;
      }
    })
    .join("\n\n");
}

function findMessageId(value) {
  if (!value || typeof value !== "object") return undefined;
  for (const key of ["messageId", "message_id"]) {
    const candidate = value[key];
    if (
      (typeof candidate === "string" && candidate.trim()) ||
      (typeof candidate === "number" && Number.isFinite(candidate))
    ) {
      return String(candidate);
    }
  }
  for (const child of Object.values(value)) {
    const found = findMessageId(child);
    if (found) return found;
  }
  return undefined;
}

async function loadSentEventIds(path) {
  const states = await loadDeliveryStates(path);
  return new Set(
    [...states.entries()]
      .filter(([, state]) => state === "sent" || state === "advanced")
      .map(([id]) => id)
  );
}

async function loadDeliveryStates(path) {
  try {
    const lines = (await readFile(path, "utf8")).split(/\r?\n/).filter(Boolean);
    const states = new Map();
    for (const line of lines) {
      const row = parseJson(line, "relay audit");
      if (
        ["sending", "sent", "unknown", "advanced", "quarantined"].includes(
          row.type
        ) &&
        Array.isArray(row.eventIds)
      ) {
        for (const id of row.eventIds) states.set(id, row.type);
      }
    }
    return states;
  } catch (error) {
    if (error?.code === "ENOENT") return new Map();
    throw error;
  }
}

async function writeAudit(path, entry) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await appendFile(path, `${JSON.stringify(entry)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
}

async function defaultDescribe(event) {
  const cardId = extractCardId(event);
  if (!cardId) {
    return {
      event,
      cardId: undefined,
      userVisible: false,
      diagnostic: "事件缺少可解析的任务标识"
    };
  }
  try {
    const shown = await runCli(["workboard", "show", cardId, "--json"]);
    const card = shown?.card ?? shown;
    return {
      event,
      cardId,
      title: oneLine(card?.title, "未命名任务"),
      status: oneLine(card?.status, event.kind),
      detail: oneLine(
        event.message ??
          card?.metadata?.attempts?.at(-1)?.error ??
          card?.metadata?.comments?.at(-1)?.body,
        "状态已更新"
      )
    };
  } catch (error) {
    return {
      event,
      cardId,
      userVisible: false,
      diagnostic: `任务详情读取失败：${oneLine(error.message)}`
    };
  }
}

async function defaultSend(message) {
  const sent = await runCli([
    "message",
    "send",
    "--channel",
    "telegram",
    "--account",
    config.telegramAccount,
    "--target",
    config.telegramTarget,
    "--message",
    message,
    "--json"
  ]);
  const messageId = findMessageId(sent);
  if (!messageId) throw new Error("Telegram send returned no message ID");
  return { messageId, raw: sent };
}

async function processOnce(deps = {}) {
  const fetchEvents =
    deps.fetchEvents ??
    (() =>
      gatewayCall("workboard.notifications.events", {
        subscriptionId: config.subscriptionId,
        limit: config.limit
      }));
  const describe = deps.describe ?? defaultDescribe;
  const send = deps.send ?? defaultSend;
  const advance =
    deps.advance ??
    ((limit) =>
      gatewayCall("workboard.notifications.advance", {
        subscriptionId: config.subscriptionId,
        limit
      }));
  const auditPath = deps.auditPath ?? config.auditPath;
  const deliveryStates =
    deps.deliveryStates ??
    (deps.sentEventIds
      ? new Map([...deps.sentEventIds].map((id) => [id, "sent"]))
      : await loadDeliveryStates(auditPath));

  const fetched = await fetchEvents();
  const events = Array.isArray(fetched?.events) ? fetched.events : [];
  if (events.length === 0) return { ok: true, empty: true, count: 0 };
  if (events.some((event) => !event?.id)) {
    throw new Error("Workboard returned an event without id");
  }

  const eventIds = events.map((event) => event.id);
  const batchStates = eventIds.map((id) => deliveryStates.get(id));
  const batchAlreadySent = batchStates.every(
    (state) => state === "sent" || state === "advanced"
  );
  const unresolved = eventIds.filter((id, index) =>
    ["sending", "unknown"].includes(batchStates[index])
  );
  if (unresolved.length) {
    return {
      ok: false,
      needsReconcile: true,
      count: events.length,
      eventIds,
      unresolvedEventIds: unresolved
    };
  }
  let messageId;
  if (!batchAlreadySent) {
    const rows = [];
    for (const event of events) rows.push(await describe(event));
    const quarantined = rows.filter(
      (row) => row?.userVisible === false || isInternalControlOnly(row?.detail)
    );
    const visibleRows = rows.filter(
      (row) => row?.userVisible !== false && !isInternalControlOnly(row?.detail)
    );
    if (quarantined.length) {
      await writeAudit(auditPath, {
        type: "quarantined",
        at: new Date().toISOString(),
        subscriptionId: config.subscriptionId,
        eventIds: quarantined.map((row) => row.event.id),
        reasons: quarantined.map((row) =>
          oneLine(row.diagnostic, "内部控制事件，不向少主发送")
        )
      });
    }
    if (visibleRows.length) {
      const visibleEventIds = visibleRows.map((row) => row.event.id);
      const renderedMessage = buildMessage(visibleRows);
      await writeAudit(auditPath, {
        type: "sending",
        at: new Date().toISOString(),
        subscriptionId: config.subscriptionId,
        accountId: config.telegramAccount,
        target: config.telegramTarget,
        eventIds: visibleEventIds,
        contentHash: createHash("sha256").update(renderedMessage, "utf8").digest("hex")
      });
      let sent;
      try {
        sent = await send(renderedMessage);
      } catch (error) {
        await writeAudit(auditPath, {
          type: "unknown",
          at: new Date().toISOString(),
          subscriptionId: config.subscriptionId,
          eventIds: visibleEventIds,
          reason: oneLine(error instanceof Error ? error.message : String(error))
        });
        throw error;
      }
      messageId = sent.messageId;
      await writeAudit(auditPath, {
        type: "sent",
        at: new Date().toISOString(),
        subscriptionId: config.subscriptionId,
        accountId: config.telegramAccount,
        target: config.telegramTarget,
        eventIds: visibleEventIds,
        messageId,
        renderedMessage
      });
    }
  }

  const advanced = await advance(events.length);
  const advancedIds = Array.isArray(advanced?.events)
    ? advanced.events.map((event) => event.id)
    : [];
  assert.deepEqual(
    advancedIds,
    eventIds,
    "advanced event batch differs from the sent batch"
  );
  await writeAudit(auditPath, {
    type: "advanced",
    at: new Date().toISOString(),
    subscriptionId: config.subscriptionId,
    eventIds,
    messageId,
    replayAfterConfirmedSend: batchAlreadySent
  });
  return {
    ok: true,
    empty: false,
    count: events.length,
    eventIds,
    messageId,
    replayAfterConfirmedSend: batchAlreadySent
  };
}

async function withLock(operation) {
  try {
    await mkdir(config.lockPath, { mode: 0o700 });
  } catch (error) {
    if (error?.code === "EEXIST") {
      const ageMs = Date.now() - (await stat(config.lockPath)).mtimeMs;
      if (ageMs <= 120_000) {
        return { ok: true, skipped: "already-running" };
      }
      await rm(config.lockPath, { recursive: true, force: true });
      await mkdir(config.lockPath, { mode: 0o700 });
    } else {
      throw error;
    }
  }
  try {
    return await operation();
  } finally {
    try {
      await rmdir(config.lockPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

async function selfTest() {
  const sampleId = "03cc322d-839b-469b-a180-ea834cbc8059";
  assert.equal(
    extractCardId({ runId: `workboard:${sampleId}:123` }),
    sampleId
  );
  assert.equal(extractCardId({ message: "no uuid here" }), undefined);
  assert.equal(findMessageId({ result: { messageId: 1132 } }), "1132");

  const event = {
    id: "event-1",
    kind: "completed",
    createdAt: 1,
    message: "done",
    runId: `workboard:${sampleId}:1`
  };
  const auditPath = `${process.env.TEMP ?? process.cwd()}/workboard-relay-test-${process.pid}.jsonl`;
  await rm(auditPath, { force: true });
  let sends = 0;
  let advances = 0;
  let sentText = "";
  const ok = await processOnce({
    fetchEvents: async () => ({ events: [event] }),
    describe: async (value) => ({
      event: value,
      cardId: sampleId,
      title: "fixture",
      status: "done",
      detail: "ok"
    }),
    send: async (message) => {
      sends += 1;
      sentText = message;
      return { messageId: "fixture-message" };
    },
    advance: async () => {
      advances += 1;
      return { events: [event] };
    },
    auditPath,
    sentEventIds: new Set()
  });
  assert.equal(ok.ok, true);
  assert.equal(sends, 1);
  assert.equal(advances, 1);
  assert.equal(sentText, "少主，本宫盯着的「fixture」已经办妥。");
  assert.doesNotMatch(
    sentText,
    /Workboard 主动回报|Card|event|heartbeat|proof|completed|done|[0-9a-f]{8}-[0-9a-f-]{27,}/i
  );

  assert.equal(
    humanizeTitle(
      `【模拟验收】新脚本 Relay completed 端到端验证 20260726-1230 ${sampleId}`
    ),
    "新脚本 通知 完成 全程验证"
  );
  assert.equal(
    buildMessage([
      {
        event: { kind: "failed", id: "event-2" },
        cardId: sampleId,
        title: "模型调用",
        status: "failed",
        detail: "quota exhausted"
      }
    ]),
    "少主，「模型调用」没办成，本宫已经按住了。缘故：所用模型额度已尽，当前不能继续。"
  );
  assert.equal(
    buildMessage([
      {
        event: { kind: "blocked", id: "event-3" },
        cardId: sampleId,
        title: "配置核对",
        status: "blocked",
        detail: "permission denied"
      }
    ]),
    "少主，「配置核对」卡住了，本宫已经叫停。缘故：当前权限不足。"
  );
  assert.equal(
    buildMessage([
      {
        event: { kind: "stale", id: "event-4" },
        cardId: sampleId,
        title: "长任务",
        status: "stale",
        detail: "timeout"
      }
    ]),
    "少主，「长任务」迟迟没有回话，本宫已把它按停，免得空耗。"
  );
  assert.equal(
    buildMessage([
      {
        event: { kind: "cancelled", id: "event-5" },
        cardId: sampleId,
        title: "旧任务",
        status: "cancelled",
        detail: "cancelled by owner"
      }
    ]),
    "少主，「旧任务」已经停下，本宫不会让它继续乱跑。"
  );
  assert.equal(
    humanizeReason({
      event: { kind: "failed" },
      status: "error",
      detail: "token unauthorized"
    }),
    "凭据没有通过"
  );
  assert.equal(
    humanizeReason({
      event: { kind: "failed" },
      status: "error",
      detail: "ECONNREFUSED"
    }),
    "网络没有连通"
  );

  await assert.rejects(
    processOnce({
      fetchEvents: async () => ({ events: [event] }),
      describe: async (value) => ({
        event: value,
        cardId: sampleId,
        title: "fixture",
        status: "failed",
        detail: "telegram failure fixture"
      }),
      send: async () => {
        throw new Error("telegram unavailable");
      },
      advance: async () => {
        throw new Error("must not advance");
      },
      auditPath: `${auditPath}.send-fail`,
      sentEventIds: new Set()
    }),
    /telegram unavailable/
  );
  const unknownStates = await loadDeliveryStates(`${auditPath}.send-fail`);
  assert.equal(unknownStates.get(event.id), "unknown");
  let unknownReplaySends = 0;
  const unknownReplay = await processOnce({
    fetchEvents: async () => ({ events: [event] }),
    send: async () => {
      unknownReplaySends += 1;
      return { messageId: "must-not-send" };
    },
    advance: async () => {
      throw new Error("must not advance unresolved delivery");
    },
    auditPath: `${auditPath}.send-fail`
  });
  assert.equal(unknownReplay.needsReconcile, true);
  assert.equal(unknownReplaySends, 0);

  let replaySends = 0;
  const replay = await processOnce({
    fetchEvents: async () => ({ events: [event] }),
    send: async () => {
      replaySends += 1;
      return { messageId: "unexpected" };
    },
    advance: async () => ({ events: [event] }),
    auditPath: `${auditPath}.replay`,
    sentEventIds: new Set([event.id])
  });
  assert.equal(replaySends, 0);
  assert.equal(replay.replayAfterConfirmedSend, true);

  let malformedSends = 0;
  const malformed = { id: "event-malformed", kind: "completed", message: "no task id" };
  const quarantined = await processOnce({
    fetchEvents: async () => ({ events: [malformed] }),
    describe: defaultDescribe,
    send: async () => {
      malformedSends += 1;
      return { messageId: "must-not-send" };
    },
    advance: async () => ({ events: [malformed] }),
    auditPath: `${auditPath}.malformed`,
    deliveryStates: new Map()
  });
  assert.equal(quarantined.ok, true);
  assert.equal(malformedSends, 0);
  assert.equal((await loadDeliveryStates(`${auditPath}.malformed`)).get(malformed.id), "advanced");

  let controlSends = 0;
  const controlEvent = { ...event, id: "event-control" };
  await processOnce({
    fetchEvents: async () => ({ events: [controlEvent] }),
    describe: async (value) => ({
      event: value,
      cardId: sampleId,
      title: "内部回执",
      status: "completed",
      detail: "ANNOUNCE_SKIP"
    }),
    send: async () => {
      controlSends += 1;
      return { messageId: "must-not-send" };
    },
    advance: async () => ({ events: [controlEvent] }),
    auditPath: `${auditPath}.control`,
    deliveryStates: new Map()
  });
  assert.equal(controlSends, 0);

  await assert.rejects(
    processOnce({
      fetchEvents: async () => ({ events: [event] }),
      describe: async (value) => ({
        event: value,
        cardId: sampleId,
        title: "fixture",
        status: "failed",
        detail: "blocked"
      }),
      send: async () => ({ messageId: "fixture-message-2" }),
      advance: async () => {
        throw new Error("advance unavailable");
      },
      auditPath: `${auditPath}.advance-fail`,
      sentEventIds: new Set()
    }),
    /advance unavailable/
  );

  const empty = await processOnce({
    fetchEvents: async () => ({ events: [] }),
    auditPath: `${auditPath}.empty`,
    sentEventIds: new Set()
  });
  assert.equal(empty.empty, true);
  await rm(auditPath, { force: true });
  await rm(`${auditPath}.advance-fail`, { force: true });
  await rm(`${auditPath}.send-fail`, { force: true });
  await rm(`${auditPath}.malformed`, { force: true });
  await rm(`${auditPath}.control`, { force: true });
  return { ok: true, fixtures: 22 };
}

if (process.argv.includes("--self-test")) {
  console.log(JSON.stringify(await selfTest(), null, 2));
} else if (process.argv.includes("--preview-fixtures")) {
  const previewRows = [
    {
      event: { kind: "completed", id: "preview-completed" },
      title: "新通知全程验证",
      status: "done",
      detail: "heartbeat and proof recorded"
    },
    {
      event: { kind: "failed", id: "preview-failed" },
      title: "模型调用",
      status: "failed",
      detail: "quota exhausted"
    },
    {
      event: { kind: "blocked", id: "preview-blocked" },
      title: "配置核对",
      status: "blocked",
      detail: "permission denied"
    },
    {
      event: { kind: "stale", id: "preview-stale" },
      title: "长任务",
      status: "stale",
      detail: "timeout"
    }
  ];
  console.log(buildMessage(previewRows));
} else if (process.argv.includes("--dry-run")) {
  const fetched = await gatewayCall("workboard.notifications.events", {
    subscriptionId: config.subscriptionId,
    limit: config.limit
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: true,
        count: Array.isArray(fetched?.events) ? fetched.events.length : 0,
        eventIds: Array.isArray(fetched?.events)
          ? fetched.events.map((event) => event.id)
          : []
      },
      null,
      2
    )
  );
} else {
  console.log(JSON.stringify(await withLock(() => processOnce()), null, 2));
}

import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin from "../dist/index.js";

const root = await mkdtemp(join(tmpdir(), "life-files-"));
const ownerRoot = join(root, "agents", "life", "users", "Vivi");
let toolFactory;
const api = {
  rootDir: root,
  pluginConfig: { agentId: "life", ownerRoot },
  registerTool(factory) {
    toolFactory = factory;
  }
};

try {
  plugin.register(api);
  assert.equal(toolFactory({ agentId: "ops" }), null);
  const tool = toolFactory({ agentId: "life" });
  assert.equal(tool.name, "life_files");

  const madeDir = await tool.execute("mkdir", {
    action: "mkdir",
    path: "备忘录"
  });
  assert.equal(madeDir.details.ok, true);

  const content = "这是少主 Vivi 的备忘录。\n\n继续完成 OpenClaw 调查任务。";
  const created = await tool.execute("create", {
    action: "create",
    path: "备忘录/Vivi.md",
    content
  });
  assert.equal(created.details.ok, true);
  assert.equal(await readFile(join(ownerRoot, "备忘录", "Vivi.md"), "utf8"), content);
  if (process.platform !== "win32") {
    assert.equal(
      (await stat(join(ownerRoot, "备忘录", "Vivi.md"))).mode & 0o777,
      0o600
    );
  }

  const duplicate = await tool.execute("duplicate", {
    action: "create",
    path: "备忘录/Vivi.md",
    content: "must not overwrite"
  });
  assert.equal(duplicate.details.ok, false);
  assert.equal(await readFile(join(ownerRoot, "备忘录", "Vivi.md"), "utf8"), content);

  for (const path of ["../outside.md", "/tmp/outside.md", "bad\\outside.md"]) {
    const escaped = await tool.execute("escape", {
      action: "create",
      path,
      content: "blocked"
    });
    assert.equal(escaped.details.ok, false);
  }

  const unsupported = await tool.execute("unsupported", {
    action: "create",
    path: "脚本/run.sh",
    content: "blocked"
  });
  assert.equal(unsupported.details.ok, false);

  const read = await tool.execute("get", {
    action: "get",
    path: "备忘录/Vivi.md"
  });
  assert.equal(read.details.ok, true);
  assert.equal(read.details.content, content);

  const updatedContent = `${content}\n\n已核对。`;
  const updated = await tool.execute("update", {
    action: "update",
    path: "备忘录/Vivi.md",
    content: updatedContent
  });
  assert.equal(updated.details.ok, true);

  const appended = await tool.execute("append", {
    action: "append",
    path: "备忘录/Vivi.md",
    content: "\n追加一行。"
  });
  assert.equal(appended.details.ok, true);
  assert.equal(
    await readFile(join(ownerRoot, "备忘录", "Vivi.md"), "utf8"),
    `${updatedContent}\n追加一行。`
  );

  const listed = await tool.execute("list", {
    action: "list",
    path: "备忘录"
  });
  assert.deepEqual(listed.details.items, [{ name: "Vivi.md", type: "file" }]);

  await mkdir(ownerRoot, { recursive: true });
  const outside = join(root, "outside.md");
  await writeFile(outside, "private", "utf8");
  let symlinkSupported = true;
  try {
    await symlink(outside, join(ownerRoot, "Linked.md"));
  } catch {
    symlinkSupported = false;
  }
  if (symlinkSupported) {
    const linked = await tool.execute("linked", {
      action: "get",
      path: "Linked.md"
    });
    assert.equal(linked.details.ok, false);
  }

  console.log("LIFE_OWNER_FILES_TEST_OK");
} finally {
  await rm(root, { recursive: true, force: true });
}

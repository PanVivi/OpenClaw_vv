import { appendFile, lstat, mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/core";
const TOOL_NAME = "life_files";
const MAX_CONTENT_BYTES = 256 * 1024;
const MAX_PATH_LENGTH = 240;
const MAX_DEPTH = 6;
const ALLOWED_EXTENSIONS = new Set([".md", ".txt", ".json", ".csv", ".ics"]);
const ParamsSchema = Type.Object({
    action: Type.Union([
        Type.Literal("list"),
        Type.Literal("get"),
        Type.Literal("mkdir"),
        Type.Literal("create"),
        Type.Literal("update"),
        Type.Literal("append")
    ]),
    path: Type.Optional(Type.String({ maxLength: MAX_PATH_LENGTH })),
    content: Type.Optional(Type.String({ maxLength: MAX_CONTENT_BYTES }))
}, { additionalProperties: false });
function result(value) {
    return {
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
        details: value
    };
}
function pathSegments(value, allowEmpty) {
    if (value === undefined && allowEmpty)
        return [];
    if (typeof value !== "string")
        throw new Error("path is required");
    const normalized = value.normalize("NFKC").trim();
    if (!normalized && allowEmpty)
        return [];
    if (!normalized ||
        normalized.length > MAX_PATH_LENGTH ||
        isAbsolute(normalized) ||
        normalized.includes("\\") ||
        /[\u0000-\u001f\u007f]/u.test(normalized)) {
        throw new Error("invalid relative path");
    }
    const segments = normalized.split("/");
    if (segments.length > MAX_DEPTH ||
        segments.some((segment) => !segment ||
            segment === "." ||
            segment === ".." ||
            segment.trim() !== segment)) {
        throw new Error("path contains an invalid segment or is too deep");
    }
    return segments;
}
function confinedTarget(ownerRoot, segments) {
    const target = resolve(ownerRoot, ...segments);
    const fromRoot = relative(ownerRoot, target);
    if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
        throw new Error("path escaped owner root");
    }
    return target;
}
function fileTarget(ownerRoot, value) {
    const segments = pathSegments(value, false);
    const target = confinedTarget(ownerRoot, segments);
    const extension = extname(target).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
        throw new Error(`unsupported file type; allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`);
    }
    return { segments, target };
}
function contentValue(value) {
    if (typeof value !== "string")
        throw new Error("content is required");
    if (Buffer.byteLength(value, "utf8") > MAX_CONTENT_BYTES) {
        throw new Error(`content exceeds ${MAX_CONTENT_BYTES} UTF-8 bytes`);
    }
    return value;
}
async function directoryOnly(target) {
    const info = await lstat(target);
    if (!info.isDirectory() || info.isSymbolicLink()) {
        throw new Error("target is not a regular directory");
    }
    return info;
}
async function regularFileOnly(target) {
    const info = await lstat(target);
    if (!info.isFile() || info.isSymbolicLink()) {
        throw new Error("target is not a regular file");
    }
    return info;
}
async function ensureDirectories(ownerRoot, segments) {
    await mkdir(ownerRoot, { recursive: true, mode: 0o700 });
    await directoryOnly(ownerRoot);
    let current = ownerRoot;
    for (const segment of segments) {
        current = join(current, segment);
        try {
            await directoryOnly(current);
        }
        catch (error) {
            const code = error && typeof error === "object" && "code" in error
                ? String(error.code)
                : "";
            if (code !== "ENOENT")
                throw error;
            await mkdir(current, { mode: 0o700 });
            await directoryOnly(current);
        }
    }
    return current;
}
async function verifyExistingPath(ownerRoot, segments) {
    await directoryOnly(ownerRoot);
    let current = ownerRoot;
    for (let index = 0; index < segments.length; index += 1) {
        current = join(current, segments[index]);
        if (index === segments.length - 1)
            break;
        await directoryOnly(current);
    }
}
function sha256(content) {
    return createHash("sha256").update(content, "utf8").digest("hex");
}
export default definePluginEntry({
    id: "life-memo",
    name: "Life Owner Files",
    description: "Constrained owner life-files storage for the life agent.",
    register(api) {
        const pluginConfig = (api.pluginConfig ?? {});
        const allowedAgentId = typeof pluginConfig.agentId === "string" && pluginConfig.agentId.trim()
            ? pluginConfig.agentId.trim()
            : "life";
        const configuredOwnerRoot = typeof pluginConfig.ownerRoot === "string" && pluginConfig.ownerRoot.trim()
            ? pluginConfig.ownerRoot.trim()
            : join(process.env.HOME ?? api.rootDir ?? ".", ".openclaw", "agents", allowedAgentId, "users", "Vivi");
        if (typeof pluginConfig.ownerRoot === "string" &&
            pluginConfig.ownerRoot.trim() &&
            !isAbsolute(pluginConfig.ownerRoot.trim())) {
            throw new Error("life-memo ownerRoot must be an absolute path");
        }
        const ownerRoot = resolve(configuredOwnerRoot);
        api.registerTool((ctx) => {
            if (ctx.agentId !== allowedAgentId)
                return null;
            return {
                name: TOOL_NAME,
                label: "Life Owner Files",
                description: "Manage only UTF-8 life files under the owner's dedicated folder. Use list/get/mkdir/create/update/append. Paths must be relative and use supported text extensions. This tool cannot delete, execute, or access anything outside that folder.",
                parameters: ParamsSchema,
                async execute(_toolCallId, rawParams) {
                    const params = rawParams;
                    try {
                        if (params.action === "list") {
                            const segments = pathSegments(params.path, true);
                            await ensureDirectories(ownerRoot, []);
                            await verifyExistingPath(ownerRoot, segments);
                            const target = confinedTarget(ownerRoot, segments);
                            await directoryOnly(target);
                            const entries = await readdir(target, { withFileTypes: true });
                            const items = entries
                                .filter((entry) => !entry.isSymbolicLink())
                                .filter((entry) => entry.isDirectory() ||
                                (entry.isFile() &&
                                    ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase())))
                                .map((entry) => ({
                                name: entry.name,
                                type: entry.isDirectory() ? "directory" : "file"
                            }))
                                .sort((a, b) => a.name.localeCompare(b.name));
                            return result({
                                ok: true,
                                root: ownerRoot,
                                path: segments.join("/"),
                                items
                            });
                        }
                        if (params.action === "mkdir") {
                            const segments = pathSegments(params.path, false);
                            const target = await ensureDirectories(ownerRoot, segments);
                            return result({
                                ok: true,
                                action: "mkdir",
                                path: relative(ownerRoot, target).replaceAll("\\", "/")
                            });
                        }
                        const { segments, target } = fileTarget(ownerRoot, params.path);
                        await ensureDirectories(ownerRoot, segments.slice(0, -1));
                        await verifyExistingPath(ownerRoot, segments);
                        if (params.action === "get") {
                            await regularFileOnly(target);
                            const content = await readFile(target, "utf8");
                            return result({
                                ok: true,
                                path: segments.join("/"),
                                bytes: Buffer.byteLength(content, "utf8"),
                                sha256: sha256(content),
                                content
                            });
                        }
                        const content = contentValue(params.content);
                        if (params.action === "create") {
                            const handle = await open(target, "wx", 0o600);
                            try {
                                await handle.writeFile(content, "utf8");
                                await handle.sync();
                            }
                            finally {
                                await handle.close();
                            }
                        }
                        else if (params.action === "update") {
                            await regularFileOnly(target);
                            const temp = join(dirname(target), `.${randomUUID()}.tmp`);
                            const handle = await open(temp, "wx", 0o600);
                            try {
                                await handle.writeFile(content, "utf8");
                                await handle.sync();
                                await handle.close();
                                await rename(temp, target);
                            }
                            catch (error) {
                                await handle.close().catch(() => undefined);
                                await rm(temp, { force: true }).catch(() => undefined);
                                throw error;
                            }
                        }
                        else if (params.action === "append") {
                            const info = await regularFileOnly(target);
                            if (info.size + Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
                                throw new Error(`result exceeds ${MAX_CONTENT_BYTES} UTF-8 bytes`);
                            }
                            await appendFile(target, content, { encoding: "utf8", mode: 0o600 });
                        }
                        else {
                            throw new Error("unsupported action");
                        }
                        const finalContent = await readFile(target, "utf8");
                        return result({
                            ok: true,
                            action: params.action,
                            path: segments.join("/"),
                            bytes: Buffer.byteLength(finalContent, "utf8"),
                            sha256: sha256(finalContent)
                        });
                    }
                    catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        return result({ ok: false, error: message });
                    }
                }
            };
        }, { name: TOOL_NAME, optional: true });
    }
});

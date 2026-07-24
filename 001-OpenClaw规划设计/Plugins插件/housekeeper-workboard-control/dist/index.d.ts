import { definePluginEntry } from "openclaw/plugin-sdk/core";
type JsonRecord = Record<string, unknown>;
export declare function buildDispatchArgs(params: JsonRecord): string[];
export declare function buildShowArgs(params: JsonRecord): string[];
export declare function resolveCliInvocation(): {
    command: string;
    prefix: string[];
};
declare const plugin: ReturnType<typeof definePluginEntry>;
export default plugin;

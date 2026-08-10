import { definePluginEntry } from "openclaw/plugin-sdk/core";
type JsonRecord = Record<string, unknown>;
export declare function buildGatewayRequest(kind: "dispatch" | "show", params: JsonRecord, managedBoardId?: string): {
    method: string;
    params: {
        boardId: string;
        id?: undefined;
    };
} | {
    method: string;
    params: {
        id: string;
        boardId?: undefined;
    };
};
declare const plugin: ReturnType<typeof definePluginEntry>;
export default plugin;

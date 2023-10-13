import type { ServerSentEventSink } from "./server-sent-events.js";

export const sinks = new Set<ServerSentEventSink>();

export const CHOKIDAR_RPC_PATH = "/__hwy__chokidar_rpc";

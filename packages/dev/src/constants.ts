import type { ServerSentEventSink } from "./server-sent-events.js";

export const sinks = new Set<ServerSentEventSink>();

export const LIVE_REFRESH_RPC_PATH = "/__hwy__live_refresh_rpc";

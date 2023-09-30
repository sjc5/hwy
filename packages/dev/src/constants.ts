import { ServerSentEventSink } from "./server-sent-events.js";

export const IS_DEV = process.env.NODE_ENV === "development";
export const sinks = new Set<ServerSentEventSink>();

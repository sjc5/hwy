import type { Context, Next } from "hono";
import { IS_DEV, sinks } from "./constants.js";
import { server_sent_events } from "./server-sent-events.js";

const LIVE_REFRESH_PATH = "/__live_refresh";

function refreshMiddleware() {
  return async function (c: Context, next: Next) {
    if (IS_DEV && c.req.path === LIVE_REFRESH_PATH) {
      const response = server_sent_events({
        onOpen(sink) {
          sinks.add(sink);
        },
        onClose(sink) {
          sinks.delete(sink);
        },
      });

      return response;
    }

    return next();
  };
}

export { LIVE_REFRESH_PATH, refreshMiddleware };

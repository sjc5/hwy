import { LIVE_REFRESH_SSE_PATH } from "../../common/index.mjs";
import type { Context, Next } from "hono";
import { sinks } from "./constants.js";
import { server_sent_events } from "./server-sent-events.js";

function refreshMiddleware() {
  return async function (c: Context, next: Next) {
    if (c.req.path === LIVE_REFRESH_SSE_PATH) {
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

export { refreshMiddleware };

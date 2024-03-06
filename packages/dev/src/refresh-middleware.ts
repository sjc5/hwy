import { H3Event } from "h3";
import { LIVE_REFRESH_SSE_PATH } from "../../common/index.mjs";
import { sinks } from "./constants.js";
import { server_sent_events } from "./server-sent-events.js";

function refreshMiddleware() {
  return async function (event: H3Event) {
    if (event.path === LIVE_REFRESH_SSE_PATH) {
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
  };
}

export { refreshMiddleware };

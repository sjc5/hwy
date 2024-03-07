import { H3Event, eventHandler, sendStream, setResponseHeaders } from "h3";
import { sinks } from "./constants.js";
import { server_sent_events } from "./server-sent-events.js";

const refreshMiddleware = eventHandler(async function (event: H3Event) {
  const { stream, headers } = server_sent_events({
    onOpen(sink) {
      sinks.add(sink);
    },
    onClose(sink) {
      sinks.delete(sink);
    },
  });
  setResponseHeaders(event, Object.fromEntries(headers.entries()));
  return sendStream(event, stream);
});

export { refreshMiddleware };

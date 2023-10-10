/*
Adapted from: https://github.com/hattipjs/hattip/blob/main/packages/base/response/src/index.ts
Original license: MIT
Copied from source on: August 21, 2023
*/

type ServerSentEvent = {
  id?: string;
  event?: string;
  data?: string;
  retry?: number;
};

type ServerSentEventSink = {
  send_message(message: string): void;
  send(event: ServerSentEvent): void;
  sendRaw(data: string): void;
  ping(): void;
  close(): void;
};

type ServerSentEventsInit = {
  responseInit?: ResponseInit;
  onOpen?: (sink: ServerSentEventSink) => void;
  onClose?: (sink: ServerSentEventSink) => void;
};

function server_sent_events(options: ServerSentEventsInit): Response {
  const { onOpen, onClose, responseInit = {} } = options;

  const defaultHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  const headers = new Headers(responseInit.headers);

  for (const [key, value] of Object.entries(defaultHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  let sink: ServerSentEventSink;

  let onCloseCalled = false;

  function callOnClose() {
    if (!onCloseCalled) {
      onCloseCalled = true;
      onClose?.(sink);
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      sink = {
        sendRaw(data: string) {
          controller.enqueue(encoder.encode(data));
        },

        send(event) {
          if (event.id?.includes("\n")) {
            throw new Error("Event ID cannot contain newlines");
          } else if (event.event?.includes("\n")) {
            throw new Error("Event name cannot contain newlines");
          }

          const retry =
            event.retry === undefined ? "" : `retry: ${event.retry}\n`;

          const ev = event.event ? `event: ${event.event}\n` : "";

          let data = "";
          if (event.data) {
            const lines = event.data.split("\n");
            data = lines.map((line) => `data: ${line}`).join("\n") + "\n";
          }

          const id = event.id ? `id: ${event.id}\n` : "";

          this.sendRaw(retry + ev + data + id + "\n");
        },

        send_message(message) {
          this.send({ data: message });
        },

        ping() {
          const data = encoder.encode(": ping");
          controller.enqueue(data);
        },

        close() {
          controller.close();
          callOnClose();
        },
      };

      onOpen?.(sink);
    },

    cancel() {
      callOnClose();
    },
  });

  return new Response(stream, { ...responseInit, headers });
}

export { server_sent_events };
export type { ServerSentEventSink };

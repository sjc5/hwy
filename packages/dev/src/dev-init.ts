import { LIVE_REFRESH_PATH } from "../../common/index.mjs";
import { CHOKIDAR_RPC_PATH, sinks } from "./constants.js";
import { hwy_log } from "./hwy-log.js";
import { refreshMiddleware } from "./refresh-middleware.js";
import type { Hono } from "hono";

function send_signal_to_sinks() {
  hwy_log(`Sending reload signal to browser...`);
  for (const sink of sinks) {
    sink.send_message("reload");
  }
}

function devInit({
  app,
  watchExclusions,
}: {
  app: Hono<any>;
  watchExclusions?: string[];
}) {
  app.use(LIVE_REFRESH_PATH, refreshMiddleware());

  app.all(CHOKIDAR_RPC_PATH, async (c) => {
    send_signal_to_sinks();

    return c.text("you called chokidar rpc");
  });
}

export { devInit };

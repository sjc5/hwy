import {
  LIVE_REFRESH_SSE_PATH,
  LIVE_REFRESH_RPC_PATH,
  type DeploymentTarget,
} from "../../common/index.mjs";
import { sinks } from "./constants.js";
import { hwyLog } from "./hwy-log.js";
import { refreshMiddleware } from "./refresh-middleware.js";
import type { Hono } from "hono";

function send_signal_to_sinks() {
  hwyLog(`Sending reload signal to browser...`);
  for (const sink of sinks) {
    sink.send_message("reload");
  }
}

function devInit({
  app,
  deploymentTarget,
}: {
  app: Hono<any>;
  deploymentTarget?: DeploymentTarget;
}) {
  // Wrangler does its own live reload
  if (deploymentTarget !== "cloudflare-pages") {
    app.use(LIVE_REFRESH_SSE_PATH, refreshMiddleware());
  }

  app.all(LIVE_REFRESH_RPC_PATH, async (c) => {
    send_signal_to_sinks();

    return c.text("you called chokidar rpc");
  });
}

export { devInit };

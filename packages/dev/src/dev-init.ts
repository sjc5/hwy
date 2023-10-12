import { LIVE_REFRESH_PATH } from "../../common/index.mjs";
import { refreshMiddleware } from "./refresh-middleware.js";
import { devSetup } from "./setup.js";
import type { Hono } from "hono";

function devInit({
  app,
  watchExclusions,
}: {
  app: Hono<any>;
  watchExclusions?: string[];
}) {
  devSetup({ watchExclusions });
  app.use(LIVE_REFRESH_PATH, refreshMiddleware());
}

export { devInit };

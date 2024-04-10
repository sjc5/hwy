import {
  App,
  createApp,
  createRouter,
  defineEventHandler,
  getRequestURL,
  sendRedirect,
  serveStatic,
  setResponseHeader,
  setResponseStatus,
} from "h3";
import type { readFile, stat } from "node:fs/promises";
import { getMimeType } from "../../common/get_mimes.js";
import { getHwyGlobal } from "../../common/index.mjs";

let dynamicReadFile: typeof readFile;
let dynamicStat: typeof stat;

const isServer = typeof document === "undefined";

try {
  if (isServer) {
    const { readFile, stat } = await import("node:fs/promises");
    dynamicReadFile = readFile;
    dynamicStat = stat;
  }
} catch {}

const hwyGlobal = getHwyGlobal();

export function initH3(app?: App): App {
  if (!app) {
    app = createApp();
  }
  const router = createRouter();
  app.use(router);
  router.use("/favicon.ico", defaultFaviconHandler);
  router.use("/public/**", publicHandler);
  return app;
}

const defaultFaviconHandler = defineEventHandler(async (event) => {
  const publicURL = hwyGlobal.get("getOrigPublicURL")("favicon.ico");
  if (publicURL) {
    return sendRedirect(
      event,
      hwyGlobal.get("getOrigPublicURL")("favicon.ico"),
    );
  }
  setResponseStatus(event, 404);
  return "Not found";
});

const publicHandler = defineEventHandler((event) => {
  setResponseHeader(
    event,
    "Cache-Control",
    "public, max-age=31536000, immutable",
  );
  if (hwyGlobal.get("isDev")) {
    if (event.path.includes("public/dist/standard-bundled.css")) {
      setResponseHeader(event, "Cache-Control", "no-cache");
    }
  }
  return serveStatic(event, {
    indexNames: [],
    getContents: (url) => {
      const pathname = getRequestURL(event).pathname;
      const mime = getMimeType(pathname);
      if (mime) {
        setResponseHeader(event, "Content-Type", mime);
      }
      return dynamicReadFile(hwyGlobal.get("getOrigPublicURL")(url));
    },
    getMeta: async (url) => {
      const mime = getMimeType(url);
      if (mime) {
        setResponseHeader(event, "Content-Type", mime);
      }
      const stats = await dynamicStat(
        hwyGlobal.get("getOrigPublicURL")(url),
      ).catch();
      if (!stats || !stats.isFile()) {
        return;
      }
      return {
        size: stats.size,
        mtime: stats.mtimeMs,
      };
    },
  });
});

import {
  App,
  createRouter,
  defineEventHandler,
  eventHandler,
  getRequestURL,
  sendRedirect,
  serveStatic,
  setResponseHeader,
  setResponseStatus,
} from "h3";
import type { readFile, stat } from "node:fs/promises";
import { get_hwy_global } from "../../common/index.mjs";
import { getMimeType } from "./get-mimes.js";
import {
  getPublicUrl,
  get_original_public_url,
} from "./utils/hashed-public-url.js";
import { file_url_to_path, node_path } from "./utils/url-polyfills.js";

let dynamic_read_file: typeof readFile;
let dynamic_stat: typeof stat;

const IS_SERVER = typeof document === "undefined";

try {
  if (IS_SERVER) {
    const { readFile, stat } = await import("node:fs/promises");
    dynamic_read_file = readFile;
    dynamic_stat = stat;
  }
} catch {}

function dirname_from_import_meta(import_meta_url: string) {
  return node_path?.dirname(file_url_to_path(import_meta_url)) ?? "";
}

// although instantiated with let, this should only ever be set once inside hwyInit
let ROOT_DIRNAME = "";
let PUBLIC_URL_PREFIX = "";

const IMMUTABLE_CACHE_HEADER_VALUE = "public, max-age=31536000, immutable";

const hwy_global = get_hwy_global();

async function hwyInit({
  app,
  importMetaUrl,
}: {
  app: App;
  importMetaUrl?: string;
}) {
  console.log("Initializing Hwy app");

  if (hwy_global.get("is_dev")) {
    const { setupLiveRefreshEndpoints } = await import("@hwy-js/dev");
    setupLiveRefreshEndpoints({ app });
  }

  ROOT_DIRNAME = dirname_from_import_meta(importMetaUrl ?? "");

  const router = createRouter();
  app.use(router);

  router.use(
    "/favicon.ico",
    eventHandler(async (event) => {
      const publicUrl = getPublicUrl("favicon.ico");
      if (publicUrl) {
        return sendRedirect(event, getPublicUrl("favicon.ico"));
      }
      setResponseStatus(event, 404);
      return "Not found";
    }),
  );

  router.use(
    "/public/**",
    defineEventHandler((event) => {
      setResponseHeader(event, "Cache-Control", IMMUTABLE_CACHE_HEADER_VALUE);
      if (hwy_global.get("is_dev")) {
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
          return dynamic_read_file(
            get_original_public_url({
              hashed_url: url,
            }),
          );
        },
        getMeta: async (url) => {
          const mime = getMimeType(url);
          if (mime) {
            setResponseHeader(event, "Content-Type", mime);
          }
          const stats = await dynamic_stat(
            get_original_public_url({
              hashed_url: url,
            }),
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
    }),
  );

  return { app, router };
}

export {
  PUBLIC_URL_PREFIX,
  // private
  ROOT_DIRNAME,
  // public
  hwyInit,
};

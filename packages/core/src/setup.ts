import {
  App,
  H3Event,
  createRouter,
  defineEventHandler,
  eventHandler,
  getRequestURL,
  sendRedirect,
  serveStatic,
  setResponseHeader,
  setResponseStatus,
} from "h3";
import { readFile, stat } from "node:fs/promises";
import { get_hwy_global } from "../../common/index.mjs";
import { getMimeType } from "./get-mimes.js";
import {
  getPublicUrl,
  get_original_public_url,
} from "./utils/hashed-public-url.js";
import { file_url_to_path, node_path } from "./utils/url-polyfills.js";

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
  console.log("\nInitializing Hwy app...");

  if (hwy_global.get("is_dev")) {
    const { setupLiveRefreshEndpoints } = await import("@hwy-js/dev");
    setupLiveRefreshEndpoints({ app });
  }

  ROOT_DIRNAME = dirname_from_import_meta(importMetaUrl ?? "");

  app.use(
    "/favicon.ico",
    eventHandler(async (event) => {
      try {
        return sendRedirect(event, getPublicUrl("favicon.ico"));
      } catch {
        setResponseStatus(event, 404);
      }
    }),
  );

  const router = createRouter();
  app.use(router);

  const static_path = "/public/**";
  router.use(
    static_path,
    eventHandler(function (event) {
      if (hwy_global.get("is_dev")) {
        if (event.path.includes("public/dist/standard-bundled.css")) {
          // __TODO check this is working
          setResponseHeader(event, "Cache-Control", "no-cache");
        }
      }
      setResponseHeader(event, "Cache-Control", IMMUTABLE_CACHE_HEADER_VALUE);
    }),
  );

  router.use(
    static_path,
    defineEventHandler((event) => {
      return serveStatic(event, {
        indexNames: [],
        getContents: (url) => {
          const pathname = getRequestURL(event).pathname;
          const mime = getMimeType(pathname);
          if (mime) {
            setResponseHeader(event, "Content-Type", mime);
          }
          return readFile(
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
          const stats = await stat(
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

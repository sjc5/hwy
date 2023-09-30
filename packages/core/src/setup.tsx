import type { Hono, Context, Next } from "hono";
import type { serveStatic as serveStaticFn } from "@hono/node-server/serve-static";
import { hwyDev } from "./utils/conditional-dev.js";
import path from "node:path";
import {
  warm_public_file_maps,
  getPublicUrl,
  get_serve_static_options,
} from "./utils/hashed-public-url.js";
import { warm_css_files } from "./components/css-imports.js";

function file_url_to_path(url: string): string {
  if (!url) return "";
  return decodeURI(url.replace(/^file:\/\//, ""));
}

async function dirname_from_import_meta(import_meta_url: string) {
  try {
    const { fileURLToPath } = await import("node:url");
    return path.dirname(fileURLToPath(import_meta_url));
  } catch {
    return path.dirname(file_url_to_path(import_meta_url));
  }
}

// although instantiated with let, this should only ever be set once inside hwyInit
let ROOT_DIRNAME = "";
let PUBLIC_URL_PREFIX = "";

type ServeStaticFn = typeof serveStaticFn;

const IMMUTABLE_CACHE_HEADER_VALUE = "public, max-age=31536000, immutable";

function immutable_cache() {
  return function (c: Context, next: Next) {
    c.header("Cache-Control", IMMUTABLE_CACHE_HEADER_VALUE);

    if (process.env.VERCEL) {
      c.header("CDN-Cache-Control", IMMUTABLE_CACHE_HEADER_VALUE);
    }

    return next();
  };
}

async function hwyInit({
  app,
  importMetaUrl,
  serveStatic,
  publicUrlPrefix,
  watchExclusions,
}: {
  app: Hono<any>;
  importMetaUrl: string;
  serveStatic: ServeStaticFn;
  publicUrlPrefix?: string;
  watchExclusions?: string[];
}) {
  console.log("\nInitializing Hwy app...");

  hwyDev?.devInit({ app, watchExclusions });

  ROOT_DIRNAME = await dirname_from_import_meta(importMetaUrl);
  PUBLIC_URL_PREFIX = publicUrlPrefix ?? "";

  await Promise.all([warm_public_file_maps(), warm_css_files()]);

  app.use("/favicon.ico", async (c) => {
    try {
      return c.redirect(getPublicUrl("favicon.ico"));
    } catch {
      return c.notFound();
    }
  });

  const static_path = "/public/*";
  app.use(static_path, immutable_cache());

  app.use(static_path, serveStatic(get_serve_static_options()));
}

export {
  // public
  hwyInit,

  // private
  ROOT_DIRNAME,
  PUBLIC_URL_PREFIX,
};

import type { Hono, Context, Next } from "hono";
import type { serveStatic as serveStaticFn } from "@hono/node-server/serve-static";
import path from "node:path";
import {
  getPublicUrl,
  get_original_public_url,
  get_serve_static_options,
} from "./utils/hashed-public-url.js";
import { file_url_to_path } from "./utils/url-polyfills.js";
import { get_hwy_global } from "./utils/get-hwy-global.js";

function dirname_from_import_meta(import_meta_url: string) {
  return path.dirname(file_url_to_path(import_meta_url));
}

// although instantiated with let, this should only ever be set once inside hwyInit
let ROOT_DIRNAME = "";
let PUBLIC_URL_PREFIX = "";

type ServeStaticFn = typeof serveStaticFn;

const IMMUTABLE_CACHE_HEADER_VALUE = "public, max-age=31536000, immutable";

const hwy_global = get_hwy_global();

function immutable_cache() {
  const deployment_target = hwy_global.get("deployment_target");

  const should_set_cdn_cache_control =
    deployment_target === "vercel-lambda" ||
    deployment_target === "cloudflare-pages";

  return function (c: Context, next: Next) {
    c.header("Cache-Control", IMMUTABLE_CACHE_HEADER_VALUE);

    if (should_set_cdn_cache_control) {
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
}: {
  app: Hono<any>;
  importMetaUrl?: string;
  serveStatic?: ServeStaticFn;
  publicUrlPrefix?: string;
}) {
  const hwy_global = get_hwy_global();
  const deployment_target = hwy_global.get("deployment_target");

  console.log("\nInitializing Hwy app...");

  // Wrangler does its own live reload
  if (hwy_global.get("is_dev") && deployment_target !== "cloudflare-pages") {
    const { setupLiveRefreshEndpoints } = await import("@hwy-js/dev");
    setupLiveRefreshEndpoints({ app });
  }

  ROOT_DIRNAME = dirname_from_import_meta(importMetaUrl ?? "");
  PUBLIC_URL_PREFIX = publicUrlPrefix ?? "";

  app.use("/favicon.ico", async (c) => {
    try {
      return c.redirect(getPublicUrl("favicon.ico"));
    } catch {
      return c.notFound();
    }
  });

  const static_path = "/public/*";
  app.use(static_path, immutable_cache());

  if (deployment_target === "cloudflare-pages") {
    app.get(static_path, async (c) => {
      const original_public_url = get_original_public_url({
        hashed_url: c.req.path,
      });

      const hostname = c.req.url.replace(c.req.path, "");

      const new_url = hostname + "/" + original_public_url.slice(2);

      const new_req = new Request(new_url, c.req);

      return await c.env.ASSETS.fetch(new_req);
    });

    return;
  }

  if (!serveStatic) {
    throw new Error(
      "serveStatic is required unless running on Cloudflare Pages",
    );
  }

  app.use(static_path, serveStatic(get_serve_static_options()));
}

export {
  // public
  hwyInit,

  // private
  ROOT_DIRNAME,
  PUBLIC_URL_PREFIX,
};

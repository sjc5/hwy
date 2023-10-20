import { DEFAULT_PORT } from "../../common/index.mjs";
import type { Options } from "../index.js";
import { get_is_target_deno } from "./utils.js";

const VERSIONS = {
  HWY: "^0.4.0-beta.31",
  HONO_NODE_SERVER: "^1.2.0",
  HONO: "^3.7.5",
  HTMX: "^1.9.6",
  TYPESCRIPT: "^5.2.2",
  TAILWIND: "^3.3.3",
  NPROGRESS: "^0.2.0",
  NPROGRESS_TYPES: "^0.2.1",
  NODE_TYPES: "^20.8.3",
  BUN_TYPES: "^1.0.5-canary.20231007T140129",

  // Cloudflare
  CLOUDFLARE_WORKER_TYPES: "^4.20231002.0",
  NPM_RUN_ALL: "^4.1.5",
  WRANGLER: "^3.11.0",
} as const;

export const LATEST_HWY_VERSION = VERSIONS.HWY;

function get_package_json(options: Options) {
  /* TAILWIND PREBUILD */
  let tailwind_prebuild = {};
  if (options.css_preference === "tailwind") {
    tailwind_prebuild = {
      "hwy-prebuild":
        "tailwindcss -i src/styles/tw-input.css -o src/styles/tw-output.bundle.css",
    };
  }

  const is_targeting_deno = get_is_target_deno(options);

  return (
    JSON.stringify(
      {
        name: options.project_name,
        private: true,
        type: "module",
        scripts: {
          ...tailwind_prebuild,
          [options.deployment_target === "vercel-lambda"
            ? "vercel-build"
            : "build"]:
            (options.lang_preference === "typescript" && !is_targeting_deno
              ? "tsc --noEmit && "
              : "") + "hwy-build",
          ...(options.deployment_target === "cloudflare-pages"
            ? {
                "dev:serve": "hwy-dev-serve",
                "dev:wrangler": `wrangler pages dev ./dist --compatibility-flag="nodejs_compat" --port=${DEFAULT_PORT} --live-reload`,
              }
            : {
                start: get_is_target_deno(options)
                  ? "deno run -A dist/main.js"
                  : options.deployment_target === "bun"
                  ? "bun dist/main.js"
                  : "node dist/main.js",
              }),
          dev:
            options.deployment_target === "cloudflare-pages"
              ? "npm run build && npm-run-all --parallel dev:*"
              : "hwy-dev-serve",
        },
        dependencies: {
          ...(!is_targeting_deno && options.deployment_target !== "bun"
            ? { "@hono/node-server": VERSIONS.HONO_NODE_SERVER }
            : {}),
          hono: VERSIONS.HONO,
          hwy: LATEST_HWY_VERSION,
        },
        devDependencies: {
          ...(options.deployment_target === "cloudflare-pages" &&
          options.lang_preference === "typescript"
            ? { "@cloudflare/workers-types": VERSIONS.CLOUDFLARE_WORKER_TYPES }
            : {}),
          "@hwy-js/build": LATEST_HWY_VERSION,
          "@hwy-js/dev": LATEST_HWY_VERSION,
          ...(options.lang_preference === "typescript"
            ? {
                ...(!is_targeting_deno && options.deployment_target !== "bun"
                  ? { "@types/node": VERSIONS.NODE_TYPES }
                  : {}),
                ...(options.with_nprogress
                  ? { "@types/nprogress": VERSIONS.NPROGRESS_TYPES }
                  : {}),
              }
            : {}),
          ...(options.deployment_target === "bun" &&
          options.lang_preference === "typescript"
            ? { "bun-types": VERSIONS.BUN_TYPES }
            : {}),
          "htmx.org": VERSIONS.HTMX,
          ...(options.deployment_target === "cloudflare-pages"
            ? { "npm-run-all": VERSIONS.NPM_RUN_ALL }
            : {}),
          ...(options.with_nprogress ? { nprogress: VERSIONS.NPROGRESS } : {}),
          ...(options.css_preference === "tailwind"
            ? { tailwindcss: VERSIONS.TAILWIND }
            : {}),
          ...(options.lang_preference === "typescript"
            ? { typescript: VERSIONS.TYPESCRIPT }
            : {}),
          ...(options.deployment_target === "cloudflare-pages"
            ? { wrangler: VERSIONS.WRANGLER }
            : {}),
        },
        engines: {
          node: ">=18.14.1",
        },
      },
      null,
      2,
    ) + "\n"
  );
}

export { get_package_json };

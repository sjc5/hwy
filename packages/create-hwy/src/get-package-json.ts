import { DEFAULT_PORT } from "../../common/index.mjs";
import type { Options } from "../index.js";
import { get_is_target_deno } from "./utils.js";
import fs from "node:fs";

const pkg_json = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
);

const third_party_packages = [
  "@hono/node-server",
  "hono",
  "htmx.org",
  "typescript",
  "tailwind",
  "nprogress",
  "@types/nprogress",
  "@types/node",
  "bun-types",
  "@cloudflare/workers-types",
  "npm-run-all",
  "wrangler",
] as const;

const versions_map = third_party_packages.map((pkg) => {
  return [pkg, pkg_json.devDependencies[pkg]];
});

const VERSIONS = Object.fromEntries(versions_map) as Record<
  (typeof third_party_packages)[number],
  string
>;

export const LATEST_HWY_VERSION = pkg_json.version;

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
            ? { "@hono/node-server": VERSIONS["@hono/node-server"] }
            : {}),
          hono: VERSIONS["hono"],
          hwy: LATEST_HWY_VERSION,
        },
        devDependencies: {
          ...(options.deployment_target === "cloudflare-pages" &&
          options.lang_preference === "typescript"
            ? {
                "@cloudflare/workers-types":
                  VERSIONS["@cloudflare/workers-types"],
              }
            : {}),
          "@hwy-js/build": LATEST_HWY_VERSION,
          "@hwy-js/dev": LATEST_HWY_VERSION,
          ...(options.lang_preference === "typescript"
            ? {
                ...(!is_targeting_deno && options.deployment_target !== "bun"
                  ? { "@types/node": VERSIONS["@types/node"] }
                  : {}),
                ...(options.with_nprogress
                  ? { "@types/nprogress": VERSIONS["@types/nprogress"] }
                  : {}),
              }
            : {}),
          ...(options.deployment_target === "bun" &&
          options.lang_preference === "typescript"
            ? { "bun-types": VERSIONS["bun-types"] }
            : {}),
          "htmx.org": VERSIONS["htmx.org"],
          ...(options.deployment_target === "cloudflare-pages"
            ? { "npm-run-all": VERSIONS["npm-run-all"] }
            : {}),
          ...(options.with_nprogress
            ? { nprogress: VERSIONS["nprogress"] }
            : {}),
          ...(options.css_preference === "tailwind"
            ? { tailwindcss: VERSIONS["tailwind"] }
            : {}),
          ...(options.lang_preference === "typescript"
            ? { typescript: VERSIONS["typescript"] }
            : {}),
          ...(options.deployment_target === "cloudflare-pages"
            ? { wrangler: VERSIONS["wrangler"] }
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

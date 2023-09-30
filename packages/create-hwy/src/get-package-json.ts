import { Options } from "./types.js";
import { target_is_deno } from "./utils.js";

const VERSIONS = {
  HWY: "^0.2.2-beta.13",
  HONO_NODE_SERVER: "^1.2.0",
  HONO: "^3.5.8",
  HTMX: "^1.9.6",
  TYPESCRIPT: "^5.2.2",
  TAILWIND: "^3.3.3",
  NPROGRESS: "^0.2.0",
  NPROGRESS_TYPES: "^0.2.0",
  NODE_TYPES: "^20.6.3",
  CROSS_ENV: "^7.0.3",
  ESBUILD: "^0.19.3",
  NODEMON: "^3.0.1",
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

  const is_targeting_deno = target_is_deno(options);

  return (
    JSON.stringify(
      {
        name: options.project_name,
        private: true,
        type: "module",
        scripts: {
          ...tailwind_prebuild,
          [options.deployment_target === "vercel" ? "vercel-build" : "build"]:
            (options.lang_preference === "typescript" && !is_targeting_deno
              ? "tsc --noEmit && "
              : "") +
            "hwy-build" +
            (options.deployment_target === "vercel"
              ? " && cp -r dist/* api"
              : options.deployment_target === "deno_deploy"
              ? " && hwy-deno-deploy-hack"
              : ""),
          start: target_is_deno(options)
            ? "deno run -A dist/main.js"
            : "node dist/main.js",
          dev: "hwy-dev-serve",
        },
        dependencies: {
          ...(!is_targeting_deno
            ? { "@hono/node-server": VERSIONS.HONO_NODE_SERVER }
            : {}),
          hono: VERSIONS.HONO,
          hwy: LATEST_HWY_VERSION,
        },
        devDependencies: {
          "@hwy-js/dev": LATEST_HWY_VERSION,
          ...(options.lang_preference === "typescript"
            ? {
                "@types/node": VERSIONS.NODE_TYPES,
                "@types/nprogress": VERSIONS.NPROGRESS_TYPES,
              }
            : {}),
          "cross-env": VERSIONS.CROSS_ENV,
          esbuild: VERSIONS.ESBUILD,
          "htmx.org": VERSIONS.HTMX,
          nodemon: VERSIONS.NODEMON,
          ...(options.with_nprogress ? { nprogress: VERSIONS.NPROGRESS } : {}),
          ...(options.css_preference === "tailwind"
            ? { tailwindcss: VERSIONS.TAILWIND }
            : {}),
          ...(options.lang_preference === "typescript"
            ? { typescript: VERSIONS.TYPESCRIPT }
            : {}),
        },
        engines: {
          node: ">=18.14.1",
        },
      },
      null,
      2
    ) + "\n"
  );
}

export { get_package_json };

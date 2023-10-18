import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PORT, type DeploymentTarget } from "../../common/index.mjs";
import esbuild from "esbuild";
import { pathToFileURL } from "node:url";

type HwyConfig = {
  dev: {
    port: number;
    watchExclusions?: Array<string>;
  };
  deploymentTarget: DeploymentTarget;
};

let cached_hwy_config: HwyConfig | undefined;

const js_path = path.join(process.cwd(), "hwy.config.js");
const ts_path = path.join(process.cwd(), "hwy.config.ts");
const js_config_exists = fs.existsSync(js_path);
const ts_config_exists = fs.existsSync(ts_path);

async function get_hwy_config() {
  if (cached_hwy_config) {
    return cached_hwy_config;
  }

  let internal_hwy_config: HwyConfig | undefined;

  if (js_config_exists) {
    const imported = await import(pathToFileURL(js_path).href);
    internal_hwy_config = imported.default;
  }

  if (ts_config_exists) {
    const ts_text = fs.readFileSync(ts_path, "utf8");

    const { code } = await esbuild.transform(ts_text, {
      loader: "ts",
      format: "esm",
    });

    const dist_path = path.join(process.cwd(), "dist");
    fs.mkdirSync(dist_path, { recursive: true });

    const written_path = path.join(dist_path, "hwy.config.js");
    fs.writeFileSync(written_path, code);

    const imported = await import(pathToFileURL(written_path).href);
    internal_hwy_config = imported.default;
  }

  cached_hwy_config = {
    dev: {
      port: Number(internal_hwy_config?.dev?.port || DEFAULT_PORT),
      watchExclusions: internal_hwy_config?.dev?.watchExclusions || [],
    },
    deploymentTarget: internal_hwy_config?.deploymentTarget || "node",
  };

  return cached_hwy_config;
}

export { get_hwy_config };
export type { HwyConfig };

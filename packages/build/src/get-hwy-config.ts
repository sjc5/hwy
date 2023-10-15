import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PORT } from "../../common/index.mjs";

type HwyConfig = {
  dev: {
    port: number;
    watchExclusions: Array<string>;
  };
  deploymentTarget:
    | "node"
    | "bun"
    | "deno"
    | "deno-deploy"
    | "vercel-lambda"
    | "cloudflare-pages";
};

function get_hwy_config() {
  const hwy_config_exists = fs.existsSync(path.join(process.cwd(), "hwy.json"));

  let res: Record<string, any> = {};

  if (hwy_config_exists) {
    try {
      res = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "hwy.json"), "utf-8"),
      );
    } catch {
      console.error("Error parsing hwy.json. Using default config.");
    }
  }

  const hwy_config: HwyConfig = {
    dev: {
      port: Number(res.dev?.port || DEFAULT_PORT),
      watchExclusions: res.dev?.watchExclusions || [],
    },
    deploymentTarget: res.deploymentTarget || "node",
  };

  return hwy_config;
}

export { get_hwy_config };

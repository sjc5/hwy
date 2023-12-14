export const HWY_PREFIX = "__hwy__";
export const LIVE_REFRESH_SSE_PATH = `/${HWY_PREFIX}live_refresh_sse`;
export const LIVE_REFRESH_RPC_PATH = `/${HWY_PREFIX}live_refresh_rpc`;

export const HWY_GLOBAL_KEYS = {
  deployment_target: `${HWY_PREFIX}deployment_target`,
  is_dev: `${HWY_PREFIX}is_dev`,
  critical_bundled_css: `${HWY_PREFIX}critical_bundled_css`,
  standard_bundled_css_exists: `${HWY_PREFIX}standard_bundled_css_exists`,
  paths: `${HWY_PREFIX}paths`,
  public_map: `${HWY_PREFIX}public_map`,
  public_reverse_map: `${HWY_PREFIX}public_reverse_map`,
} as const;

export const DEFAULT_PORT = 3000;

export type DeploymentTarget =
  | "bun"
  | "vercel-lambda"
  | "node"
  | "deno-deploy"
  | "deno"
  | "cloudflare-pages";

export type HwyConfig = {
  deploymentTarget: DeploymentTarget;
  dev?: {
    port?: number;
    watchExclusions?: Array<string>;
    watchInclusions?: Array<string>;
  };
};

export const SPLAT_SEGMENT = ":catch*";

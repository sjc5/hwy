export const HWY_PREFIX = "__hwy_internal__";
export const LIVE_REFRESH_SSE_PATH = `/${HWY_PREFIX}live_refresh_sse`;
export const LIVE_REFRESH_RPC_PATH = `/${HWY_PREFIX}live_refresh_rpc`;

export const HWY_GLOBAL_KEYS = {
  deployment_target: `${HWY_PREFIX}deployment_target`,
  route_strategy: `${HWY_PREFIX}route_strategy`,
  is_dev: `${HWY_PREFIX}is_dev`,
  critical_bundled_css: `${HWY_PREFIX}critical_bundled_css`,
  standard_bundled_css_exists: `${HWY_PREFIX}standard_bundled_css_exists`,
  paths: `${HWY_PREFIX}paths`,
  public_map: `${HWY_PREFIX}public_map`,
  public_reverse_map: `${HWY_PREFIX}public_reverse_map`,
  mode: `${HWY_PREFIX}mode`,
  use_dot_server_files: `${HWY_PREFIX}use_dot_server_files`,
  import_map_setup: `${HWY_PREFIX}import_map_setup`,
} as const;

export const DEFAULT_PORT = 3000;

type CloudflarePages = "cloudflare-pages";
type NonCloudflarePages =
  | "bun"
  | "vercel-lambda"
  | "node"
  | "deno-deploy"
  | "deno";

export type DeploymentTarget = NonCloudflarePages | CloudflarePages;

export type HwyConfig = {
  dev?: {
    port?: number;
    watchExclusions?: Array<string>;
    hotReloadCssBundle?: boolean;
  };
  usePreactCompat?: boolean;
} & (
  | { mode: "mpa"; useDotServerFiles: boolean }
  | { mode: "htmx-mpa"; useDotServerFiles: boolean }
  | { mode: "preact-mpa"; useDotServerFiles: true }
  | { mode: "preact-spa"; useDotServerFiles?: boolean }
) &
  (
    | {
        deploymentTarget: NonCloudflarePages;
        routeStrategy?:
          | "bundle"
          | "warm-cache-at-startup"
          | "always-lazy"
          | "lazy-once-then-cache";
      }
    | {
        deploymentTarget: "cloudflare-pages";
        routeStrategy?: "bundle";
      }
  );

export const SPLAT_SEGMENT = ":catch*";

export type RefreshFilePayload = {
  changeType: "critical-css" | "css-bundle" | "standard";
  criticalCss?: string;
  at: string;
};

export const CRITICAL_CSS_ELEMENT_ID = "__hwy-critical-css";

/***************************************
 * Client global
 **************************************/

export const CLIENT_SIGNAL_KEYS = [
  "activeData",
  "activePaths",
  "outermostErrorBoundaryIndex",
  "errorToRender",
  "splatSegments",
  "params",
  "actionData",
  "activeComponents",
  "activeErrorBoundaries",
] as const;

export const OTHER_CLIENT_KEYS = [
  "globalOnLoadStart",
  "globalOnLoadEnd",
] as const;

export const CLIENT_GLOBAL_KEYS = [
  ...CLIENT_SIGNAL_KEYS,
  ...OTHER_CLIENT_KEYS,
] as const;

export type HwyClientGlobal = Partial<{
  [K in (typeof CLIENT_GLOBAL_KEYS)[number]]: any;
}>;

export type HwyClientGlobalKey = keyof HwyClientGlobal;

/***************************************
 * Hwy Types
 * ************************************/

export type ActivePathData = {
  // not needed in recursive component
  matchingPaths?: any[];
  activeHeads: any[];

  // needed in recursive component
  activeData: any[];
  activePaths: string[];
  outermostErrorBoundaryIndex: number | undefined;
  errorToRender: any;
  splatSegments: string[];
  params: Record<string, string>;
  actionData: any[];
  activeComponents: any[];
  activeErrorBoundaries: any[];
};

export type ErrorBoundaryProps = {
  error: unknown;
};

type PermissiveStringArray = Array<string> | ReadonlyArray<string>;

export type ClientModuleDef = {
  names: PermissiveStringArray;
  external?: PermissiveStringArray;
} & ({ code: string } | { pathsFromRoot: PermissiveStringArray });

export type ClientModuleDefs =
  | Array<ClientModuleDef>
  | ReadonlyArray<ClientModuleDef>;

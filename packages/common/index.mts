import type { HeadBlock, Path } from "../core/src/router.js";

export const HWY_PREFIX = "__hwy_internal__";
export const HWY_SYMBOL = Symbol.for(HWY_PREFIX);
export const LIVE_REFRESH_SSE_PATH = `/${HWY_PREFIX}live_refresh_sse`;
export const LIVE_REFRESH_RPC_PATH = `/${HWY_PREFIX}live_refresh_rpc`;

export type HwyConfig = {
  dev?: {
    watchExclusions?: Array<string>;
    watchInclusions?: Array<string>;
  };
  routeStrategy?:
    | "bundle"
    | "warm-cache-at-startup"
    | "always-lazy"
    | "lazy-once-then-cache";
};

export type RefreshFilePayload = {
  changeType: "critical-css" | "css-bundle" | "standard";
  criticalCss?: string;
  at: string;
};

export const CRITICAL_CSS_ELEMENT_ID = "data-hwy-critical-css";

/***************************************
 * Client global
 **************************************/

export const CLIENT_GLOBAL_KEYS = [
  "loadersData",
  "importURLs",
  "outermostErrorBoundaryIndex",
  "splatSegments",
  "params",
  "actionData",
  "activeComponents",
  "activeErrorBoundaries",
  "adHocData",
  "buildID",
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
  loadersData: any[];
  importURLs: string[];
  outermostErrorBoundaryIndex: number | undefined;
  splatSegments: string[];
  params: Record<string, string>;
  actionData: any[];
  activeComponents: any[];
  activeErrorBoundaries: any[];
};

export interface AdHocData extends Record<string, any> {}

// PATHS

// HWY GLOBAL (SERVER)

export type HwyGlobal = {
  hwyConfig: HwyConfig;
  isDev: boolean;
  criticalBundledCSS: string;
  paths: Array<Path>;
  publicMap: Record<string, string>;
  publicReverseMap: Record<string, string>;
  buildID: string;
  defaultHeadBlocks: Array<HeadBlock>;
  devRefreshPort: string;
  rootDirname: string;
  getPublicURL: (url: string) => string;
  getOrigPublicURL: (hashedURL: string) => string;
};

export type HwyGlobalKey = keyof HwyGlobal;

export const HWY_GLOBAL_KEYS: { [K in keyof HwyGlobal]: any } = {
  hwyConfig: "",
  isDev: "",
  criticalBundledCSS: "",
  paths: "",
  publicMap: "",
  publicReverseMap: "",
  buildID: "",
  defaultHeadBlocks: "",
  devRefreshPort: "",
  rootDirname: "",
  getPublicURL: "",
  getOrigPublicURL: "",
} as const;

for (const key in HWY_GLOBAL_KEYS) {
  HWY_GLOBAL_KEYS[key as HwyGlobalKey] = HWY_PREFIX + key;
}

export function getHwyGlobal() {
  const dangerousGlobalThis = globalThis as any;

  if (!dangerousGlobalThis[HWY_SYMBOL]) {
    dangerousGlobalThis[HWY_SYMBOL] = {};
  }

  function get<K extends HwyGlobalKey>(key: K) {
    return dangerousGlobalThis[HWY_SYMBOL][HWY_PREFIX + key] as HwyGlobal[K];
  }

  function set<K extends HwyGlobalKey, V extends HwyGlobal[K]>(
    key: K,
    value: V,
  ) {
    dangerousGlobalThis[HWY_SYMBOL][HWY_PREFIX + key] = value;
  }

  return { get, set };
}

///////////////////////////////////
// CLIENT GLOBAL
///////////////////////////////////

export function getHwyClientGlobal() {
  const dangerousGlobalThis = globalThis as any;

  function get<K extends HwyClientGlobalKey>(key: K) {
    return dangerousGlobalThis[HWY_SYMBOL][key] as HwyClientGlobal[K];
  }

  function set<K extends HwyClientGlobalKey, V extends HwyClientGlobal[K]>(
    key: K,
    value: V,
  ) {
    dangerousGlobalThis[HWY_SYMBOL][key] = value;
  }

  return { get, set };
}

// CORE TYPES

export type DataProps = {
  request: Request;
  params: Record<string, string>;
  splatSegments: string[];
};

export type Loader = (args: DataProps) => Promise<any> | any;
export type Action = (args: DataProps) => Promise<any> | any;

type NotResponse<T> = T extends Response ? never : T;

export type UIProps<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
  Outlet = any,
> = {
  loaderData: NotResponse<Awaited<ReturnType<LoaderType>>>;
  actionData: NotResponse<Awaited<ReturnType<ActionType>>> | undefined;
  Outlet: Outlet;
  params: Record<string, string>;
  splatSegments: string[];
  adHocData: AdHocData | undefined;
};

export type HeadProps<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = Omit<UIProps<LoaderType, ActionType>, "Outlet" | "adHocData"> & {
  request: Request;
};

export type HeadFunction<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = (props: HeadProps<LoaderType, ActionType>) => Array<HeadBlock>;

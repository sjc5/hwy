export const HWY_PREFIX = "__hwy_internal__";
export const HWY_PREFIX_JSON = `${HWY_PREFIX}json`;
export const HWY_SYMBOL = Symbol.for(HWY_PREFIX);
export const HWY_ROUTE_CHANGE_EVENT_KEY = "hwy:route-change";

type HwyClientGlobal = {
  loadersData: Array<any>;
  importURLs: Array<string>;
  outermostErrorIndex: number;
  splatSegments: Array<string>;
  params: Record<string, string>;
  activeComponents: Array<any>;
  activeErrorBoundaries: Array<any>;
  adHocData: any;
  buildID: string;
};

export type HwyClientGlobalKey = keyof HwyClientGlobal;

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

// __TODO set up go/ts type sharing script
export type HeadBlock = {
  tag?: string;
  safeAttributes?: Record<string, string>;
  booleanAttributes?: Array<string>;
  innerHTML?: string;
};

export type GetRouteDataOutput<AHD extends any = any> = {
  title: string;
  metaHeadBlocks: Array<HeadBlock>;
  restHeadBlocks: Array<HeadBlock>;
  loadersData: Array<any>;
  importURLs: Array<string>;
  outermostErrorIndex: number;
  splatSegments: Array<string>;
  params: Record<string, string>;
  adHocData: AHD;
  buildID: string;
  deps: Array<string>;
  cssBundles: Array<string>;

  // SSR Only
  activeErrorBoundaries: Array<any> | null;
  activeComponents: Array<any> | null;
};

export type RouteData<AHD extends any = any> = {
  response: Response | null;
  data: GetRouteDataOutput<AHD> | null;
  mergedResponseInit: ResponseInit | null;
  ssrData?: {
    ssrInnerHTML: string;
    clientEntryURL: string;
    devRefreshScript: string;
    criticalCSSElementID: string;
    criticalCSS: string;
    bundledCSSURL: string;
  };
};

export type ScrollState = { x: number; y: number };
export type RouteChangeEventDetail = {
  scrollState?: ScrollState;
  index?: number;
};
export type RouteChangeEvent = CustomEvent<RouteChangeEventDetail>;

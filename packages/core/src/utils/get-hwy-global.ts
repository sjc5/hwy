import type { HwyConfig, Paths } from "@hwy-js/build";
import { HWY_PREFIX, type DeploymentTarget } from "../../../common/index.mjs";
import { signal } from "@preact/signals";

type HwyGlobal = Partial<{
  deployment_target: DeploymentTarget;
  route_strategy: NonNullable<HwyConfig["routeStrategy"]>;
  is_dev: boolean;
  critical_bundled_css: string;
  standard_bundled_css_exists: boolean;
  paths: Paths;
  public_map: Record<string, string>;
  public_reverse_map: Record<string, string>;
  test_dirname?: string;
  mode: HwyConfig["mode"];
  use_dot_server_files: boolean;
}>;

type HwyGlobalKey = keyof HwyGlobal;

function get_hwy_global() {
  const global_this = globalThis as any;

  function get<K extends HwyGlobalKey>(key: K) {
    return global_this[HWY_PREFIX + key] as HwyGlobal[K];
  }

  function set<K extends HwyGlobalKey, V extends HwyGlobal[K]>(
    key: K,
    value: V,
  ) {
    global_this[HWY_PREFIX + key] = value;
  }

  return { get, set };
}

//////////////////////////////////////////

const client_signal_keys = [
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

const other_client_keys = ["globalOnLoadStart", "globalOnLoadEnd"] as const;

const client_global_keys = [
  ...client_signal_keys,
  ...other_client_keys,
] as const;

type HwyClientGlobal = Partial<{
  [K in (typeof client_global_keys)[number]]: any;
}>;

type HwyClientGlobalKey = keyof HwyClientGlobal;

function get_hwy_client_global() {
  const global_this = globalThis as any;

  function get_signal<K extends HwyClientGlobalKey>(key: K) {
    return global_this[HWY_PREFIX][key] as HwyClientGlobal[K];
  }

  function get<K extends HwyClientGlobalKey>(key: K) {
    return global_this[HWY_PREFIX][key].value as HwyClientGlobal[K];
  }

  function set_signal<
    K extends HwyClientGlobalKey,
    V extends HwyClientGlobal[K],
  >(key: K, value: V) {
    global_this[HWY_PREFIX][key] = value;
  }

  function set<K extends HwyClientGlobalKey, V extends HwyClientGlobal[K]>(
    key: K,
    value: V,
  ) {
    if (!global_this[HWY_PREFIX][key]) {
      global_this[HWY_PREFIX][key] = signal(value);
    } else {
      global_this[HWY_PREFIX][key].value = value;
    }
  }

  return { get_signal, get, set_signal, set };
}

export { get_hwy_global, get_hwy_client_global, client_signal_keys };

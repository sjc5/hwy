import {
  HWY_PREFIX,
  type HwyClientGlobalKey,
  type HwyClientGlobal,
} from "../../common/index.mjs";
import { signal } from "@preact/signals";

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

export { get_hwy_client_global };

export type { RouteData } from "../common/index.mjs";
export {
  customHistory,
  getIsInternalLink,
  getShouldPreventLinkDefault,
  initPreactClient,
  isNavigatingSignal,
  navigate,
  submit,
} from "./src/init-preact-client.js";
export { RootOutletClient, getAdHocDataSignal } from "./src/recursive.js";

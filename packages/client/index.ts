export type { GetRouteDataOutput } from "../core/src/router.js";
export { getCustomHistory } from "./src/custom_history.js";
export {
  getIsInternalLink,
  getShouldPreventLinkDefault,
} from "./src/helpers.js";
export { getAdHocData, initClient } from "./src/init_client.js";
export { navigate, revalidate } from "./src/navigate.js";
export { addStatusListener, getStatus } from "./src/status.js";
export { submit } from "./src/submit.js";

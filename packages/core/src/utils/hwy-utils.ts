import { get_hwy_global } from "./get-hwy-global.js";
import { getPublicUrl } from "./hashed-public-url.js";
import { getRefreshScript } from "../components/dev-live-refresh-script.js";

const hwy_global = get_hwy_global();

function getCriticalCss() {
  return hwy_global.get("critical_bundled_css") || "";
}

const utils = {
  getClientEntryUrl: () => getPublicUrl("dist/client.entry.js"),
  getBundledCssUrl: () => getPublicUrl("dist/standard-bundled.css"),
  getCriticalCss,
  getRefreshScript,
} as const;

export { utils };

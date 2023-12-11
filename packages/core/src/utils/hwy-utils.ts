import { get_hwy_global } from "./get-hwy-global.js";
import { getPublicUrl } from "./hashed-public-url.js";
import { getRefreshScript } from "../components/dev-live-refresh-script.js";
import { getImportMap } from "./get-import-map.js";
import { getSsrInnerHtml } from "./get-ssr-inner-html.js";
import { getHeadBlocks } from "../components/head-elements.js";
import { CRITICAL_CSS_ELEMENT_ID } from "../../../common/index.mjs";

const hwy_global = get_hwy_global();

function getCriticalCss() {
  return hwy_global.get("critical_bundled_css") || "";
}

const utils = {
  getClientEntryUrl: () => getPublicUrl("dist/entry.client.js"),
  getBundledCssUrl: () => getPublicUrl("dist/standard-bundled.css"),
  getCriticalCss,
  getCriticalCssElementId: () => CRITICAL_CSS_ELEMENT_ID,
  getRefreshScript,
  getImportMap,
  getSsrInnerHtml,
  getHeadBlocks,
} as const;

export { utils };

import {
  CRITICAL_CSS_ELEMENT_ID,
  get_hwy_global,
} from "../../../common/index.mjs";
import { getRefreshScript } from "./dev-live-refresh-script.js";
import { getHeadBlocks } from "./get-head-blocks.js";
import { getSsrInnerHtml } from "./get-ssr-inner-html.js";
import { getPublicUrl } from "./hashed-public-url.js";

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
  getSsrInnerHtml,
  getHeadBlocks,
  getPublicUrl,
} as const;

export { utils };

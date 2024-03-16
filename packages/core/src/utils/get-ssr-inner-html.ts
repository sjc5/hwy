import { uneval } from "devalue"; // __TODO -- should this be a dynamic import so you only need it if you're using client-side React?

import {
  CLIENT_KEYS,
  HWY_PREFIX,
  RouteData,
  get_hwy_global,
} from "../../../common/index.mjs";
import { getPublicUrl } from "./hashed-public-url.js";

const hwy_global = get_hwy_global();

function setter_str(key: (typeof CLIENT_KEYS)[number], value: any) {
  return `x.${key}=${uneval(value)};`;
}

function getSsrInnerHtml(routeData: RouteData) {
  let html = `
globalThis[Symbol.for("${HWY_PREFIX}")] = {};
const x = globalThis[Symbol.for("${HWY_PREFIX}")];
x.is_dev = ${uneval(hwy_global.get("is_dev"))};
${setter_str("buildId", routeData.buildId)}
${setter_str("activeData", routeData.activePathData.activeData)}
${setter_str(
  "activePaths",
  routeData.activePathData.matchingPaths?.map((x) => {
    return getPublicUrl("dist/" + x.importPath);
  }),
)}
${setter_str(
  "outermostErrorBoundaryIndex",
  routeData.activePathData.outermostErrorBoundaryIndex,
)}
${setter_str("splatSegments", routeData.activePathData.splatSegments)}
${setter_str("params", routeData.activePathData.params)}
${setter_str("actionData", routeData.activePathData.actionData)}
${setter_str("adHocData", routeData.adHocData)}
`.trim();
  return html;
}

export { getSsrInnerHtml };

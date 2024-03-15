import { uneval } from "devalue"; // __TODO -- should this be a dynamic import so you only need it if you're using client-side React?

import {
  CLIENT_KEYS,
  HWY_PREFIX,
  RouteData,
  get_hwy_global,
} from "../../../common/index.mjs";
import { getPublicUrl } from "./hashed-public-url.js";

const hwy_global = get_hwy_global();

function global_setter_string(key: (typeof CLIENT_KEYS)[number], value: any) {
  return `x.${key}=${uneval(value)};`;
}

function getSsrInnerHtml(routeData: RouteData) {
  let html = `
globalThis[Symbol.for("${HWY_PREFIX}")] = {};
const x = globalThis[Symbol.for("${HWY_PREFIX}")];
x.is_dev = ${uneval(hwy_global.get("is_dev"))};
${global_setter_string("buildId", routeData.buildId)}
${global_setter_string("activeData", routeData.activePathData.activeData)}
${global_setter_string(
  "activePaths",
  routeData.activePathData.matchingPaths?.map((x) => {
    return getPublicUrl("dist/" + x.importPath);
  }),
)}
${global_setter_string(
  "outermostErrorBoundaryIndex",
  routeData.activePathData.outermostErrorBoundaryIndex,
)}
${global_setter_string("splatSegments", routeData.activePathData.splatSegments)}
${global_setter_string("params", routeData.activePathData.params)}
${global_setter_string("actionData", routeData.activePathData.actionData)}
${global_setter_string("adHocData", routeData.adHocData)}
`.trim();
  return html;
}

export { getSsrInnerHtml };

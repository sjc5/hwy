import { uneval } from "devalue";
import {
  ActivePathData,
  CLIENT_SIGNAL_KEYS,
  HWY_PREFIX,
  get_hwy_global,
} from "../../../common/index.mjs";
import { getPublicUrl } from "./hashed-public-url.js";

const hwy_global = get_hwy_global();

function global_setter_string(
  key: (typeof CLIENT_SIGNAL_KEYS)[number],
  value: any,
) {
  return `x.${key}=${uneval(value)};`;
}

function getSsrInnerHtml(activePathData: ActivePathData) {
  return `
globalThis[Symbol.for("${HWY_PREFIX}")] = {};
const x = globalThis[Symbol.for("${HWY_PREFIX}")];
x.is_dev = ${uneval(hwy_global.get("is_dev"))};
${global_setter_string("activeData", activePathData.activeData)}
${global_setter_string(
  "activePaths",
  activePathData.matchingPaths?.map((x) => {
    return getPublicUrl(
      "dist/pages/" + x.importPath.replace(".js", ".page.js"),
    );
  }),
)}
${global_setter_string(
  "outermostErrorBoundaryIndex",
  activePathData.outermostErrorBoundaryIndex,
)}
${global_setter_string("errorToRender", activePathData.errorToRender)}
${global_setter_string("splatSegments", activePathData.splatSegments)}
${global_setter_string("params", activePathData.params)}
${global_setter_string("actionData", activePathData.actionData)}
`.trim();
}

export { getSsrInnerHtml };

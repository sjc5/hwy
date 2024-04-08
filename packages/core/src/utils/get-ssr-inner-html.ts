import {
  CLIENT_GLOBAL_KEYS,
  HWY_PREFIX,
  getHwyGlobal,
} from "../../../common/index.mjs";
import { GetRouteDataOutput } from "../router/router.js";

const hwyGlobal = getHwyGlobal();

const { uneval } = await import("devalue");

export function getSsrInnerHtml(baseProps: GetRouteDataOutput) {
  let html = `
globalThis[Symbol.for("${HWY_PREFIX}")] = {};
const x = globalThis[Symbol.for("${HWY_PREFIX}")];
x.isDev = ${uneval(hwyGlobal.get("isDev"))};
${mkSetterStr("buildID", baseProps.buildID)}
${mkSetterStr("activeData", baseProps.activeData)}
${mkSetterStr("activePaths", baseProps.activePaths)}
${mkSetterStr(
  "outermostErrorBoundaryIndex",
  baseProps.outermostErrorBoundaryIndex,
)}
${mkSetterStr("splatSegments", baseProps.splatSegments)}
${mkSetterStr("params", baseProps.params)}
${mkSetterStr("actionData", baseProps.actionData)}
${mkSetterStr("adHocData", baseProps.adHocData)}
`.trim();
  return html;
}

function mkSetterStr(key: (typeof CLIENT_GLOBAL_KEYS)[number], value: any) {
  return `x.${key}=${uneval(value)};`;
}

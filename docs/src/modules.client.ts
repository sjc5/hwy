import { type ClientModuleDefs, CORE_CLIENT_MODULE_DEFS } from "@hwy-js/client";

export default [
  ...CORE_CLIENT_MODULE_DEFS,
  {
    code: `export { start, done } from "nprogress";`,
    names: ["nprogress"],
  },
] satisfies ClientModuleDefs;

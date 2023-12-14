import { CORE_CLIENT_MODULE_DEFS, type ClientModuleDefs } from "@hwy-js/client";

export default [
  ...CORE_CLIENT_MODULE_DEFS,
  {
    code: `export { start, done } from "nprogress";`,
    names: ["nprogress"],
  },
  {
    code: `export * from "history";`,
    names: ["history"],
  },
] satisfies ClientModuleDefs;

const CORE_CLIENT_MODULE_DEFS = [
  {
    code: `export * from "preact"; export * from "preact/hooks"; export * from "preact/jsx-runtime";`,
    names: ["preact", "preact/hooks", "preact/jsx-runtime"],
  },
  {
    code: `export * from "@preact/signals";`,
    names: ["@preact/signals"],
  },
  {
    code: `export { RootOutlet, initPreactClient, submit } from "@hwy-js/client";`,
    names: ["@hwy-js/client"],
    external: ["htmx.org", "idiomorph", "nprogress"],
  },
] as const;

export { CORE_CLIENT_MODULE_DEFS };

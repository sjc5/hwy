import type { HwyConfig } from "@hwy-js/build";

export default {
  useClientSidePreact: false,
  useDotServerFiles: false,
  deploymentTarget: "node",
  dev: {
    port: 3112,
  },
  scriptsToInject: [
    "node_modules/htmx.org/dist/htmx.min.js",
    "node_modules/htmx.org/dist/ext/head-support.js",
    "node_modules/idiomorph/dist/idiomorph-ext.min.js",
  ],
} satisfies HwyConfig;

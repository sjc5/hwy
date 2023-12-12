import type { HwyConfig } from "@hwy-js/build";

export default {
  mode: "mpa",
  deploymentTarget: "node",
  dev: {
    port: 3111,
  },
  useDotServerFiles: false,
} satisfies HwyConfig;

import type { HwyConfig } from "@hwy-js/build";

export default {
  clientLib: "htmx",
  dev: {
    port: 2389,
  },
  deploymentTarget: "node",
  useDotServerFiles: true,
} satisfies HwyConfig;

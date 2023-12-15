import type { HwyConfig } from "@hwy-js/build";

export default {
  useClientSidePreact: false,
  useDotServerFiles: false,
  deploymentTarget: "bun",
  dev: {
    port: 3002,
  },
} satisfies HwyConfig;

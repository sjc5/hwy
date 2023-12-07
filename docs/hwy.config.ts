import type { HwyConfig } from "@hwy-js/build";

export default {
  clientLib: "preact",
  dev: {
    port: 1275,
  },
  deploymentTarget: "vercel-lambda",
  routeStrategy: "bundle",
  useDotServerFiles: true,
} satisfies HwyConfig;

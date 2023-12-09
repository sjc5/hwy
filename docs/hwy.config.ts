import type { HwyConfig } from "@hwy-js/build";

export default {
  mode: "preact-mpa",
  dev: {
    port: 1275,
  },
  deploymentTarget: "vercel-lambda",
  routeStrategy: "always-lazy",
  useDotServerFiles: true,
} satisfies HwyConfig;

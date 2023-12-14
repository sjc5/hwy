import type { HwyConfig } from "@hwy-js/build";

export default {
  hydrateRouteComponents: true,
  useDotServerFiles: true,
  dev: {
    watchExclusions: ["src/styles/tw-input.css"],
  },
  deploymentTarget: "cloudflare-pages",
} satisfies HwyConfig;

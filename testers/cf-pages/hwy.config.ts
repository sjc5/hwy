import type { HwyConfig } from "@hwy-js/build";

export default {
  clientLib: "htmx",
  dev: {
    watchExclusions: ["src/styles/tw-output.bundle.css"],
    // hotReloadCssBundle: false,
  },
  deploymentTarget: "cloudflare-pages",
  useDotServerFiles: false,
} satisfies HwyConfig;

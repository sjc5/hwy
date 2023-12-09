import type { HwyConfig } from "@hwy-js/build";

export default {
  mode: "htmx-mpa",
  dev: {
    watchExclusions: ["src/styles/tw-output.bundle.css"],
    // hotReloadCssBundle: false,
  },
  deploymentTarget: "cloudflare-pages",
  useDotServerFiles: true,
} satisfies HwyConfig;

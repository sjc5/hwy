import type { HwyConfig } from "@hwy-js/build";

export default {
  mode: "preact-mpa",
  dev: {
    watchExclusions: ["src/styles/tw-input.css"],
  },
  deploymentTarget: "cloudflare-pages",
  useDotServerFiles: true,
} satisfies HwyConfig;

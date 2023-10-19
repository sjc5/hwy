import type { HwyConfig } from "@hwy-js/build";

export default {
  dev: {
    watchExclusions: ["src/styles/tw-output.bundle.css"],
  },
  deploymentTarget: "cloudflare-pages",
} satisfies HwyConfig;

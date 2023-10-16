import type { HwyConfig } from "@hwy-js/build";

export default {
  dev: {
    port: 5432,
    watchExclusions: ["src/styles/tw-output.bundle.css"],
  },
  deploymentTarget: "cloudflare-pages",
} satisfies HwyConfig;

import type { HwyConfig } from "@hwy-js/build";

export default {
  dev: {
    port: 1239,
    watchExclusions: ["src/styles/tw-output.bundle.css"],
  },
  deploymentTarget: "vercel-lambda",
} satisfies HwyConfig;

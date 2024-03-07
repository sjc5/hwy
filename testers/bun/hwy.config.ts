import type { HwyConfig } from "@hwy-js/build";

export default {
  useClientSidePreact: true,
  useDotServerFiles: true,
  dev: {
    watchExclusions: ["src/styles/tw-output.bundle.css"],
  },
} satisfies HwyConfig;

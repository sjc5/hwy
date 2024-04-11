import type { HwyConfig } from "@hwy-js/build";

export default {
  routeStrategy: "bundle",
  dev: {
    watchInclusions: ["./markdown"],
  },
} satisfies HwyConfig;

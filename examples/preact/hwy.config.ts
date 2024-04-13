import type { HwyConfig } from "@hwy-js/build";

export default {
  routeStrategy: "lazy-once-then-cache",
  usePreactCompat: true,
} satisfies HwyConfig;

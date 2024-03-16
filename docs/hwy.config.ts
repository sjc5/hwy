import type { HwyConfig } from "@hwy-js/build";

export default {
  useClientSideReact: true,
  useDotServerFiles: true,
  routeStrategy: "always-lazy",
} satisfies HwyConfig;

import type { HwyConfig } from "@hwy-js/build";

export default {
  useClientSideReact: true,
  useDotServerFiles: true,
  dev: {
    port: 1275,
  },
  routeStrategy: "always-lazy",
} satisfies HwyConfig;

export { hwyInit } from "./src/setup.js";
export { utils } from "./src/utils/hwy-utils.js";
export { getMatchingPathData } from "./src/router/get-matching-path-data.js";

export type {
  PageComponent,
  PageProps,
  Loader,
  DataProps,
  Action,
  HeadBlock,
  HeadFunction,
  HeadProps,
  ErrorBoundaryProps,
  ActivePathData,
} from "./src/types.js";

export { HeadElements } from "./src/preact/head-elements-comp.js";
export { renderRoot } from "./src/preact/render-root.js";

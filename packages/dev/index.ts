import type { JSX as PreactJSX } from "preact";

type JSXIntrinsicElements = PreactJSX.IntrinsicElements;

declare global {
  namespace JSX {
    interface IntrinsicElements extends JSXIntrinsicElements {}
  }
}

export { setupLiveRefreshEndpoints } from "./src/dev-init.js";

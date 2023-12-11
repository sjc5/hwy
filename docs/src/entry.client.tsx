import { initPreactClient, RootOutlet } from "@hwy-js/client";
import { start, done } from "nprogress";
import { BodyInner } from "./components/body-inner.js";

await initPreactClient({
  elementToHydrate: document.querySelector("body") as HTMLElement,
  hydrateWith: <BodyInner />,
  onLoadStart: start,
  onLoadEnd: done,
});

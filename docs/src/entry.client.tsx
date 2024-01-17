import { initPreactClient } from "@hwy-js/client";
import { BodyInner } from "./components/body-inner.js";

await initPreactClient({
  elementToHydrate: document.querySelector("body") as HTMLElement,
  hydrateWith: <BodyInner />,
});

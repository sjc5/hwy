import { initPreactClient } from "@hwy-js/client";
import { BodyInner } from "./components/body-inner.js";

await initPreactClient({
  elementToHydrate: document.getElementById("root") as HTMLElement,
  hydrateWith: <BodyInner />,
});

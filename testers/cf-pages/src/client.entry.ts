import { initPreactClient } from "@hwy-js/client";

await initPreactClient({
  rootElement: document.querySelector("main") as HTMLElement,
});

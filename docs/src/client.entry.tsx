import { initPreactClient } from "@hwy-js/client";
import { start, done } from "nprogress";

await initPreactClient({
  rootElement: document.getElementById("root-outlet-wrapper") as HTMLElement,
  onLoadStart: start,
  onLoadEnd: done,
});

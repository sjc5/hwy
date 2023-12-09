import { initNProgress } from "@hwy-js/client";
import { initPreactClient } from "./test_initPreactClient.js";

await initNProgress();
await initPreactClient({
  onLoadStart: (window as any).NProgress.start,
  onLoadEnd: (window as any).NProgress.done,
});

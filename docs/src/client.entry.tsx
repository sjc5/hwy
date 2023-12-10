import { initNProgress, initPreactClient } from "@hwy-js/client";

await initNProgress();
await initPreactClient({
  rootElement: document.getElementById("root-outlet-wrapper") as HTMLElement,
  onLoadStart: (window as any).NProgress.start,
  onLoadEnd: (window as any).NProgress.done,
});

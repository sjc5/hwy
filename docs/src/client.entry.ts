import { initHtmx, initIdiomorph, initNProgress } from "@hwy-js/client";

initHtmx().then(initIdiomorph).then(initNProgress);

document.addEventListener("htmx:afterSettle", () => {
  (window as any).Prism.highlightAll();
});

async function initHtmx() {
  const htmx = await import("htmx.org").catch();
  (window as any).htmx = htmx;

  await import("htmx.org/dist/ext/head-support.js" as any).catch();
}

async function initIdiomorph() {
  await import("idiomorph/dist/idiomorph-ext.js" as any).catch();
}

async function initNProgress() {
  const NProgress = await import("nprogress").catch();
  (window as any).NProgress = NProgress;
}

export { initHtmx, initIdiomorph, initNProgress };

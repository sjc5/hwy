/* --------------------------------------------------------------------------------
 * HTMX-RELATED UTILS
 * ------------------------------------------------------------------------------*/

import type { Context } from "hono";

// REDIRECT -----------------------------------------------------------------------
function redirect({
  c,
  to,
  status,
  useHxLocation,
}: {
  c: Context;
  to: string;
  status?: number;
  useHxLocation?: boolean;
}) {
  c.status(status ?? 302);
  const isHxRequest = Boolean(c.req.raw.headers.get("HX-Request"));
  if (!isHxRequest) return c.redirect(to);
  if (to.startsWith("http")) {
    c.header("HX-Redirect", to);
    return c.body(null);
  }
  if (useHxLocation) {
    c.header("HX-Location", to);
    return c.body(null);
  }
  return c.redirect(to);
}

// DEFAULT BODY PROPS -------------------------------------------------------------
const baseBodyProps = {
  "hx-ext": "head-support",
  "hx-boost": "true",
  "hx-swap": "outerHTML",
  "hx-target": "this",
} as const;
const nprogressCallbackBodyProps = {
  "hx-on::before-request": "NProgress.start()",
  "hx-on::after-request": "NProgress.done()",
  "hx-on::history-restore": 'document.getElementById("nprogress")?.remove()',
} as const;
const idiomorphBodyProps = {
  "hx-ext": "head-support, morph",
  "hx-swap": "morph:innerHTML",
} as const;
type ClientOptions = {
  nProgress?: boolean;
  idiomorph?: boolean;
};
function getDefaultBodyProps(options?: ClientOptions) {
  return {
    ...baseBodyProps,
    ...(options?.nProgress ? nprogressCallbackBodyProps : {}),
    ...(options?.idiomorph ? idiomorphBodyProps : {}),
  } as const;
}

// INITERS ------------------------------------------------------------------------
type ModuleSpecifier =
  | "htmx"
  | "htmx-head-support"
  | "idiomorph-ext"
  | "nprogress";
function getModuleSpecifier(lib: ModuleSpecifier) {
  const moduleSpecifiers = {
    htmx: "htmx.org",
    "htmx-head-support": "htmx.org/dist/ext/head-support.js",
    "idiomorph-ext": "idiomorph/dist/idiomorph-ext.js",
    nprogress: "nprogress",
  } satisfies Record<ModuleSpecifier, string>;
  return moduleSpecifiers[lib];
}

async function initHtmxInternal() {
  const htmx = await import(getModuleSpecifier("htmx")).catch();
  (window as any).htmx = htmx;
  await import(getModuleSpecifier("htmx-head-support")).catch();
}
async function initIdiomorph() {
  await import(getModuleSpecifier("idiomorph-ext")).catch();
}
async function initNProgress() {
  const NProgress = await import(getModuleSpecifier("nprogress")).catch();
  (window as any).NProgress = NProgress;
}
async function init(options?: ClientOptions) {
  if (!options || (!options.nProgress && !options.idiomorph)) {
    return initHtmxInternal();
  }
  if (options.nProgress && options.idiomorph) {
    return initHtmxInternal().then(initIdiomorph).then(initNProgress);
  }
  if (options.nProgress) {
    return initHtmxInternal().then(initNProgress);
  }
  if (options.idiomorph) {
    return initHtmxInternal().then(initIdiomorph);
  }
}

// EXPORTS ------------------------------------------------------------------------
export { init, getDefaultBodyProps, redirect };

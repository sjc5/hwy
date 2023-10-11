globalThis.__hwy__is_cloudflare = true;
const __hwy__critical_bundled_css = `body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;padding:1.5rem;background-color:#483d8b;color:#fff}`;

const __hwy__paths = [{"entry":"$.page.tsx","importPath":"pages/$.js","path":"/:catch*","segments":[{"isSplat":true,"isDynamic":false,"name":"catch*","segment":":catch*"}],"isIndex":false,"endsInSplat":true,"endsInDynamic":false},{"entry":"_index.page.tsx","importPath":"pages/_index.js","path":"/","segments":[{"isSplat":false,"isDynamic":false,"name":"","segment":""}],"isIndex":true,"endsInSplat":false,"endsInDynamic":false},{"entry":"about.page.tsx","importPath":"pages/about.js","path":"/about","segments":[{"isSplat":false,"isDynamic":false,"name":"about","segment":"about"}],"isIndex":false,"endsInSplat":false,"endsInDynamic":false},{"entry":"about/_index.page.tsx","importPath":"pages/about/_index.js","path":"/about","segments":[{"isSplat":false,"isDynamic":false,"name":"about","segment":"about"},{"isSplat":false,"isDynamic":false,"name":"","segment":""}],"isIndex":true,"endsInSplat":false,"endsInDynamic":false},{"entry":"about/learn-more.page.tsx","importPath":"pages/about/learn-more.js","path":"/about/learn-more","segments":[{"isSplat":false,"isDynamic":false,"name":"about","segment":"about"},{"isSplat":false,"isDynamic":false,"name":"learn-more","segment":"learn-more"}],"isIndex":false,"endsInSplat":false,"endsInDynamic":false},{"entry":"__auth/login.page.tsx","importPath":"pages/__auth/login.js","path":"/login","segments":[{"isSplat":false,"isDynamic":false,"name":"login","segment":"login"}],"isIndex":false,"endsInSplat":false,"endsInDynamic":false}]

const __hwy__public_map = {"public/favicon.ico":"public/favicon.751b76a5fa39.ico","public/dist/client.entry.js":"public/dist/client.entry.8f126eb8d693.js","public/dist/standard-bundled.css":"public/dist/standard-bundled.2c76e073a5e4.css"};

const __hwy__public_reverse_map = {"public/favicon.751b76a5fa39.ico":"public/favicon.ico","public/dist/client.entry.8f126eb8d693.js":"public/dist/client.entry.js","public/dist/standard-bundled.2c76e073a5e4.css":"public/dist/standard-bundled.css"};

const __hwy__standard_bundled_css_exists = true;

globalThis["__hwy__critical_bundled_css"] = __hwy__critical_bundled_css;
globalThis["__hwy__paths"] = __hwy__paths;
globalThis["__hwy__public_map"] = __hwy__public_map;
globalThis["__hwy__public_reverse_map"] = __hwy__public_reverse_map;
globalThis["__hwy__standard_bundled_css_exists"] = __hwy__standard_bundled_css_exists;

// src/main.tsx
import {
  hwyInit,
  CssImports,
  rootOutlet,
  hwyDev,
  ClientEntryScript,
  HeadElements,
  getDefaultBodyProps,
  renderRoot
} from "hwy";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { handle } from "hono/cloudflare-pages";
import { jsx, jsxs } from "hono/jsx/jsx-runtime";
var app = new Hono();
await hwyInit({
  app,
  importMetaUrl: import.meta.url,
  serveStatic: () => {
  },
  watchExclusions: ["src/styles/tw-output.bundle.css"]
});
app.use("*", logger());
app.get("*", secureHeaders());
app.all("*", async (c, next) => {
  return await renderRoot(c, next, async ({ activePathData }) => {
    return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
      /* @__PURE__ */ jsxs("head", { children: [
        /* @__PURE__ */ jsx("meta", { charSet: "UTF-8" }),
        /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
        /* @__PURE__ */ jsx(
          HeadElements,
          {
            c,
            activePathData,
            defaults: [
              { title: "hwy-cf-test-2" },
              {
                tag: "meta",
                props: {
                  name: "description",
                  content: "Take the Hwy!"
                }
              },
              {
                tag: "meta",
                props: {
                  name: "htmx-config",
                  content: JSON.stringify({
                    selfRequestsOnly: true,
                    refreshOnHistoryMiss: true,
                    scrollBehavior: "auto"
                  })
                }
              }
            ]
          }
        ),
        /* @__PURE__ */ jsx(CssImports, {}),
        /* @__PURE__ */ jsx(ClientEntryScript, {}),
        hwyDev?.DevLiveRefreshScript()
      ] }),
      /* @__PURE__ */ jsxs("body", { ...getDefaultBodyProps(), children: [
        /* @__PURE__ */ jsxs("nav", { children: [
          /* @__PURE__ */ jsx("a", { href: "/", children: /* @__PURE__ */ jsx("h1", { children: "Hwy" }) }),
          /* @__PURE__ */ jsxs("ul", { children: [
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "/about", children: "About" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "/login", children: "Login" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx("main", { children: await rootOutlet({
          activePathData,
          c,
          fallbackErrorBoundary: () => {
            return /* @__PURE__ */ jsx("div", { children: "Something went wrong." });
          }
        }) })
      ] })
    ] });
  });
});
app.notFound((c) => c.text("404 Not Found", 404));
app.onError((error, c) => {
  console.error(error);
  return c.text("500 Internal Server Error", 500);
});
var PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
var onRequest = handle(app);
console.log(`
Listening on port ${PORT}
`);
export {
  onRequest
};

import("./pages/$.js").then((x) => globalThis["./pages/$.js"] = x);
import("./pages/_index.js").then((x) => globalThis["./pages/_index.js"] = x);
import("./pages/about.js").then((x) => globalThis["./pages/about.js"] = x);
import("./pages/about/_index.js").then((x) => globalThis["./pages/about/_index.js"] = x);
import("./pages/about/learn-more.js").then((x) => globalThis["./pages/about/learn-more.js"] = x);
import("./pages/__auth/login.js").then((x) => globalThis["./pages/__auth/login.js"] = x);
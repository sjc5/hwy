import { IS_DEV, PORT } from "./utils/constants.js";
import {
  hwyInit,
  CssImports,
  rootOutlet,
  hwyDev,
  ClientEntryScript,
  HeadElements,
  HeadBlock,
  getDefaultBodyProps,
  renderRoot,
} from "hwy";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { handle } from "@hono/node-server/vercel";
import { serveStatic } from "@hono/node-server/serve-static";
import { Nav } from "./components/nav.js";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { FallbackErrorBoundary } from "./components/fallback-error-boundary.js";

const app = new Hono();
app.use("*", logger());
app.get("*", secureHeaders());

hwyInit({
  app,
  importMetaUrl: import.meta.url,
  serveStatic,
  /*
   * The publicUrlPrefix makes the monorepo work with the public
   * folder when deployed with Vercel. If you aren't using a
   * monorepo (or aren't deploying to Vercel), you won't need
   * to add a publicUrlPrefix.
   */
  publicUrlPrefix: process.env.NODE_ENV === "production" ? "docs/" : undefined,
  watchExclusions: ["src/styles/tw-output.bundle.css"],
});

const default_head_blocks: HeadBlock[] = [
  { title: "Hwy Framework" },
  {
    tag: "meta",
    props: {
      name: "description",
      content:
        "Hwy is a lightweight, flexible, and powerful alternative to NextJS, based on HTMX instead of React.",
    },
  },
  {
    tag: "link",
    props: {
      rel: "icon",
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 16 16'><text x='0' y='14'>🔥</text></svg>`,
    },
  },
  {
    tag: "meta",
    props: {
      name: "og:image",
      content: "/create-hwy-snippet.webp",
    },
  },
  {
    tag: "meta",
    props: {
      name: "htmx-config",
      content: JSON.stringify({
        selfRequestsOnly: true,
        refreshOnHistoryMiss: true,
        scrollBehavior: "auto",
      }),
    },
  },
];

app.all("*", async (c, next) => {
  if (IS_DEV) await new Promise((r) => setTimeout(r, 300));

  // // 31 days vercel edge cache (invalidated each deploy)
  c.header("CDN-Cache-Control", "public, max-age=2678400");
  // // 10 seconds client cache
  c.header("Cache-Control", "public, max-age=10");

  return await renderRoot(c, next, async ({ activePathData }) => {
    return (
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />

          <HeadElements
            c={c}
            activePathData={activePathData}
            defaults={default_head_blocks}
          />

          <CssImports />
          <ClientEntryScript />

          {hwyDev?.DevLiveRefreshScript()}
        </head>

        <body
          {...getDefaultBodyProps({ nProgress: true })}
          class="p-2 sm:p-4 flex"
        >
          <div class="px-5 lg:px-8 w-full flex flex-col">
            <div class="grow">
              <Nav />
              <div class="flex flex-col gap-8 lg:gap-12 max-w-[640px] mb-8 mt-12 mx-auto">
                {await rootOutlet({
                  c,
                  activePathData,
                  fallbackErrorBoundary: FallbackErrorBoundary,
                })}
              </div>
            </div>

            <footer class="text-xs border-t border-t-solid border-1 border-[#7773] pt-3 pb-4 shrink mt-6">
              <span class="opacity-60">
                MIT License. Copyright (c) 2023 Samuel J. Cook.
              </span>
            </footer>
          </div>
        </body>
      </html>
    );
  });
});

app.notFound((c) => {
  return c.text("404 Not Found", 404);
});

app.onError((error, c) => {
  console.error(error);
  return c.text("500 Internal Server Error", 500);
});

export default handle(app);

if (IS_DEV) {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(
      `\nListening on http://${IS_DEV ? "localhost" : info.address}:${
        info.port
      }\n`
    );
  });
}

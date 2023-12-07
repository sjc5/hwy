import { IS_DEV } from "./utils/constants.js";
import {
  hwyInit,
  CssImports,
  RootOutlet,
  DevLiveRefreshScript,
  ClientScripts,
  HeadElements,
  type HeadBlock,
  renderRoot,
  getPublicUrl,
} from "hwy";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { handle } from "@hono/node-server/vercel";
import { serveStatic } from "@hono/node-server/serve-static";
import { Nav } from "./components/nav.js";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { FallbackErrorBoundary } from "./components/fallback-error-boundary.js";
import { make_emoji_data_url } from "./utils/utils.js";

const app = new Hono();
app.use("*", logger());
app.get("*", secureHeaders());

await hwyInit({
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
});

const default_head_blocks: HeadBlock[] = [
  { title: "Hwy Framework" },
  {
    tag: "meta",
    props: {
      name: "description",
      content:
        "Hwy is a simple, lightweight, and flexible web framework, built on Hono and HTMX.",
    },
  },
  {
    tag: "link",
    props: {
      rel: "icon",
      href: make_emoji_data_url("⭐"),
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
  c.header("Cache-Control", "max-age=0, s-maxage=2678400");

  return await renderRoot({
    c,
    next,
    defaultHeadBlocks: default_head_blocks,
    htmlAttributes: { lang: "en" },
    head: function (baseProps) {
      return (
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <HeadElements {...baseProps} />
          <CssImports />
          <ClientScripts {...baseProps} />
          <DevLiveRefreshScript />
          <script defer src={getPublicUrl("prism.js")} />
        </head>
      );
    },
    body: function (baseProps) {
      return (
        <body>
          <div class="body-inner">
            <div style={{ flexGrow: 1 }}>
              <Nav />

              <div class="root-outlet-wrapper" id={"root-outlet-wrapper"}>
                <RootOutlet
                  {...baseProps}
                  fallbackErrorBoundary={FallbackErrorBoundary}
                />
              </div>
            </div>

            <footer>
              <span style={{ opacity: 0.6 }}>
                MIT License. Copyright (c) 2023 Samuel J. Cook.
              </span>
            </footer>
          </div>
        </body>
      );
    },
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

serve({ fetch: app.fetch, port: Number(process.env.PORT || 3000) }, (info) => {
  console.log(
    `\nListening on http://${IS_DEV ? "localhost" : info.address}:${
      info.port
    }\n`,
  );
});

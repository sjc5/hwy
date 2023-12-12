import { IS_DEV } from "./utils/constants.js";
import { hwyInit, utils, HeadBlock, HeadElements, renderRoot } from "hwy";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { handle } from "@hono/node-server/vercel";
import { serveStatic } from "@hono/node-server/serve-static";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { make_emoji_data_url } from "./utils/utils.js";
import { BodyInner } from "./components/body-inner.js";

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

const defaultHeadBlocks: HeadBlock[] = [
  { title: "Hwy Framework" },
  {
    tag: "meta",
    attributes: {
      name: "description",
      content:
        "Hwy is a simple, lightweight, and flexible web framework, built on Hono and HTMX.",
    },
  },
  {
    tag: "link",
    attributes: {
      rel: "icon",
      href: make_emoji_data_url("⭐"),
    },
  },
  {
    tag: "meta",
    attributes: {
      name: "og:image",
      content: "/create-hwy-snippet.webp",
    },
  },
];

app.all("*", async (c, next) => {
  if (c.req.method === "GET") {
    c.header("Cache-Control", "max-age=0, s-maxage=2678400");
  }

  return await renderRoot({
    c,
    next,
    defaultHeadBlocks,
    root: function (baseProps) {
      return (
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width,initial-scale=1"
            />

            <HeadElements {...baseProps} />

            <script defer src={utils.getPublicUrl("prism.js")} />
          </head>

          <body>
            <BodyInner {...baseProps} />
          </body>
        </html>
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

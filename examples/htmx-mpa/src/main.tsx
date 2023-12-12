import { hwyInit } from "hwy";
import { HeadElements, renderRoot } from "hwy";
import { RootOutlet } from "@hwy-js/client";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import * as htmxUtils from "@hwy-js/utils/htmx";

const { app } = await hwyInit({
  app: new Hono(),
  importMetaUrl: import.meta.url,
  serveStatic,
});

app.use("*", logger());
app.get("*", secureHeaders());

app.all("*", async (c, next) => {
  return await renderRoot({
    c,
    next,
    defaultHeadBlocks: [
      { title: "asdf" },
      {
        tag: "meta",
        attributes: {
          name: "description",
          content: "Take the Hwy!",
        },
      },
    ],
    root: (baseProps) => {
      return (
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width,initial-scale=1"
            />
            <HeadElements {...baseProps} />
          </head>

          <body
            {...htmxUtils.getDefaultBodyProps({
              idiomorph: true,
              nProgress: true,
            })}
          >
            <nav>
              <a href="/">
                <h1>Hwy</h1>
              </a>

              <ul>
                <li>
                  <a href="/about">About</a>
                </li>
                <li>
                  <a href="/login">Login</a>
                </li>
              </ul>
            </nav>

            <main>
              <RootOutlet
                {...baseProps}
                fallbackErrorBoundary={() => {
                  return <div>Something went wrong.</div>;
                }}
              />
            </main>
          </body>
        </html>
      );
    },
  });
});

app.notFound((c) => c.text("404 Not Found", 404));

app.onError((error, c) => {
  console.error(error);
  return c.text("500 Internal Server Error", 500);
});

serve({ fetch: app.fetch, port: Number(process.env.PORT || 3000) }, (info) => {
  console.log(
    `\nListening on http://${
      process.env.NODE_ENV === "development" ? "localhost" : info.address
    }:${info.port}\n`,
  );
});

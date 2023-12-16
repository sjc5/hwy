import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { RootOutlet } from "@hwy-js/client";
import { getDefaultHtmxBodyProps } from "@hwy-js/utils/htmx";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import {
  ClientScripts,
  CssImports,
  DevLiveRefreshScript,
  HeadElements,
  hwyInit,
  renderRoot,
} from "hwy";

const IS_DEV = process.env.NODE_ENV === "development";

const app = new Hono();

await hwyInit({
  app,
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
      { title: "breaking-changes-0.8.0" },
      {
        tag: "meta",
        attributes: {
          name: "description",
          content: "Take the Hwy!",
        },
      },
      {
        tag: "meta",
        attributes: {
          name: "htmx-config",
          content: JSON.stringify({
            selfRequestsOnly: true,
            refreshOnHistoryMiss: true,
            scrollBehavior: "auto",
          }),
        },
      },
    ],
    root: (routeData) => {
      return (
        <html lang="en">
          <head>
            <meta charSet="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width,initial-scale=1"
            />

            <HeadElements {...routeData} />
            <CssImports />
            <ClientScripts {...routeData} />
            <DevLiveRefreshScript />
          </head>

          <body
            {...getDefaultHtmxBodyProps({ idiomorph: true, nProgress: true })}
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
                {...routeData}
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
    `\nListening on http://${IS_DEV ? "localhost" : info.address}:${
      info.port
    }\n`,
  );
});

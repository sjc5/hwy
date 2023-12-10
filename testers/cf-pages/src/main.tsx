import {
  hwyInit,
  CssImports,
  DevLiveRefreshScript,
  ClientScripts,
  HeadElements,
  getDefaultBodyProps,
  renderRoot,
} from "hwy";
import { RootOutlet } from "@hwy-js/client";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { HtmxConfig } from "htmx.org";

const app = new Hono();

await hwyInit({ app });

app.use("*", logger());
app.get("*", secureHeaders());

const defaultHeadBlocks = [
  { title: "cf-pages-tester" },
  {
    tag: "meta",
    props: {
      name: "description",
      content: "Take the Hwy!",
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
      } satisfies HtmxConfig & {
        selfRequestsOnly: boolean;
      }),
    },
  },
];

app.all("*", async (c, next) => {
  return await renderRoot({
    c,
    next,
    htmlAttributes: { lang: "en" },
    defaultHeadBlocks,
    head: (baseProps) => {
      return (
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />

          <HeadElements {...baseProps} />
          <CssImports />
          <ClientScripts {...baseProps} />
          <DevLiveRefreshScript />
        </head>
      );
    },
    body: (baseProps) => {
      return (
        <body {...getDefaultBodyProps()}>
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
      );
    },
  });
});

app.notFound((c) => c.text("404 Not Found", 404));

app.onError((error, c) => {
  console.error(error);
  return c.text("500 Internal Server Error", 500);
});

export default app;

import {
  hwyInit,
  CssImports,
  RootOutlet,
  DevLiveRefreshScript,
  ClientScripts,
  HeadElements,
  HeadBlock,
  renderRoot,
  getDefaultBodyProps,
} from "hwy";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Sidebar } from "./components/sidebar.js";

const app = new Hono();

const IS_DEV = process.env.NODE_ENV === "development";

await hwyInit({
  app,
  importMetaUrl: import.meta.url,
  serveStatic,
});

const default_head_blocks: HeadBlock[] = [
  { title: "Tester" },
  {
    tag: "meta",
    props: {
      name: "htmx-config",
      content: JSON.stringify({
        defaultSwapStyle: "outerHTML",
        selfRequestsOnly: true,
        refreshOnHistoryMiss: true,
      }),
    },
  },
];

app.all("*", async (c, next) => {
  return await renderRoot({
    c,
    next,
    defaultHeadBlocks: default_head_blocks,
    htmlAttributes: { lang: "en" },
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
        <body {...getDefaultBodyProps({ idiomorph: true })}>
          <Sidebar />
          <main>
            <RootOutlet
              {...baseProps}
              fallbackErrorBoundary={function ErrorBoundary() {
                return <div>Error Boundary in Root</div>;
              }}
            />
          </main>
        </body>
      );
    },
  });
});

app.notFound((c) => c.text("404 Not Found", 404));

const PORT = process.env.PORT ? Number(process.env.PORT) : 9999;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(
    `\nListening on http://${IS_DEV ? "localhost" : info.address}:${
      info.port
    }\n`,
  );
});

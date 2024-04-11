import { initH3 } from "@hwy-js/h3";
import { Head, RootOutlet } from "@hwy-js/react";
import {
  eventHandler,
  setResponseHeader,
  toWebHandler,
  toWebRequest,
} from "h3";
import { getPublicURL, initHwy, renderRoot } from "hwy";
import { renderToReadableStream } from "react-dom/server";
import { RootLayout } from "./pages/layout.js";

declare module "hwy" {
  interface AdHocData {}
}
declare module "h3" {
  interface H3EventContext {}
}

await initHwy({
  importMetaURL: import.meta.url,
  defaultHeadBlocks: [
    { title: "Hwy Framework" },
    {
      tag: "meta",
      attributes: {
        name: "description",
        content: "Hwy is a simple, lightweight, and flexible web framework.",
      },
    },
    {
      tag: "meta",
      attributes: {
        name: "og:image",
        content: getPublicURL("create-hwy-snippet.webp"),
      },
    },
  ],
});

const app = initH3();

app.use(
  "*",
  eventHandler(async (event) => {
    setResponseHeader(
      event,
      "Cache-Control",
      "public, s-maxage=31536000, max-age=60, immutable",
    );

    return await renderRoot({
      request: toWebRequest(event),
      adHocData: { test2: "bob" },
      renderCallback: (routeData) => {
        return renderToReadableStream(
          <html lang="en">
            <head>
              <meta charSet="UTF-8" />
              <meta
                name="viewport"
                content="width=device-width,initial-scale=1"
              />
              <Head routeData={routeData} />
            </head>
            <body>
              <div id="root">
                <RootOutlet
                  routeData={routeData}
                  fallbackErrorBoundary={() => <div>Something went wrong.</div>}
                  layout={RootLayout}
                />
              </div>
            </body>
          </html>,
        );
      },
    });
  }),
);

const webHandler = toWebHandler(app);

const server = Bun.serve({
  port: process.env.PORT || 3000,
  fetch(request: Request) {
    return webHandler(request);
  },
});

console.log(`Listening on http://${server.hostname}:${server.port}`);

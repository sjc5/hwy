import { initH3 } from "@hwy-js/h3";
import { Head, RootOutlet } from "@hwy-js/react";
import {
  eventHandler,
  setResponseHeader,
  toNodeListener,
  toWebRequest,
} from "h3";
import { getPublicURL, initHwy, renderRoot } from "hwy";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { renderToPipeableStream } from "react-dom/server";
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
      "public, s-maxage=31536000, max-age=60",
    );

    return await renderRoot({
      request: toWebRequest(event),
      adHocData: { test2: "bob" },
      renderCallback: (routeData) => {
        return renderToPipeableStream(
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

const server = createServer(toNodeListener(app)).listen(
  process.env.PORT || 3000,
);

const addrInfo = server.address() as AddressInfo;

console.log(`Listening on http://localhost:${addrInfo.port}`);

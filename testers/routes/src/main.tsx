import { initH3 } from "@hwy-js/h3";
import { Head, RootOutlet } from "@hwy-js/react";
import { defineEventHandler, toNodeListener, toWebRequest } from "h3";
import { initHwy, renderRoot } from "hwy";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { renderToPipeableStream } from "react-dom/server";
import { Sidebar } from "./components/sidebar.js";

await initHwy({
  importMetaURL: import.meta.url,
  defaultHeadBlocks: [],
});

const app = initH3();

app.use(
  "*",
  defineEventHandler(async (event) => {
    return await renderRoot({
      request: toWebRequest(event),
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
              <Sidebar />
              <main>
                <RootOutlet
                  routeData={routeData}
                  fallbackErrorBoundary={function ErrorBoundary() {
                    return <div>Error Boundary in Root</div>;
                  }}
                />
              </main>
            </body>
          </html>,
        );
      },
    });
  }),
);

const PORT = process.env.PORT ? Number(process.env.PORT) : 9999;
const server = createServer(toNodeListener(app)).listen(PORT);
const addrInfo = server.address() as AddressInfo;
console.log(`Listening on http://${addrInfo.address}:${addrInfo.port}`);

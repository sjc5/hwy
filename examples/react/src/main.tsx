import { Head, RootOutlet } from "@hwy-js/react";
import { createApp, eventHandler, toNodeListener, toWebRequest } from "h3";
import { initHwy, renderRoot } from "hwy";
import { AddressInfo } from "net";
import { createServer } from "node:http";
import { renderToPipeableStream } from "react-dom/server";

const { app } = await initHwy({
  app: createApp(),
  importMetaURL: import.meta.url,
  defaultHeadBlocks: [
    { title: "hwy-example-react" },
    {
      tag: "meta",
      attributes: {
        name: "description",
        content: "Take the Hwy!",
      },
    },
  ],
});

app.use(
  "*",
  eventHandler(async (event) => {
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
              <nav>
                <a href="/" data-boost="true">
                  <h1>Hwy</h1>
                </a>

                <ul>
                  <li>
                    <a href="/about" data-boost="true">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="/login" data-boost="true">
                      Login
                    </a>
                  </li>
                </ul>
              </nav>

              <main>
                <RootOutlet
                  routeData={routeData}
                  fallbackErrorBoundary={() => {
                    return <div>Something went wrong.</div>;
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

const server = createServer(toNodeListener(app)).listen(
  process.env.PORT || 3000,
);

const addrInfo = server.address() as AddressInfo;

console.log(`Listening on http://localhost:${addrInfo.port}`);

import { getDefaultHtmxBodyProps } from "@hwy-js/utils/htmx";
import { createApp, eventHandler, toNodeListener } from "h3";
import {
  ClientScripts,
  CssImports,
  DevLiveRefreshScript,
  HeadElements,
  RootOutletServer,
  hwyInit,
  renderRoot,
} from "hwy";
import { AddressInfo } from "net";
import { createServer } from "node:http";

const { app } = await hwyInit({
  app: createApp(),
  importMetaUrl: import.meta.url,
});

const defaultHeadBlocks = [
  { title: "hwy-example-htmx" },
  {
    tag: "meta",
    attributes: {
      name: "description",
      content: "Take the Hwy!",
    },
  },
];

app.use(
  "*",
  eventHandler(async (event) => {
    return await renderRoot({
      event,
      defaultHeadBlocks,
      root: (routeData) => {
        return (
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
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
                <RootOutletServer
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
  }),
);

const server = createServer(toNodeListener(app)).listen(
  process.env.PORT || 3000,
);

const addrInfo = server.address() as AddressInfo;

console.log(`Listening on http://localhost:${addrInfo.port}`);

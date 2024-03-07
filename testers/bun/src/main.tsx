import { RootOutlet } from "@hwy-js/client";
import { createApp, eventHandler, toWebHandler } from "h3";
import {
  ClientScripts,
  CssImports,
  DevLiveRefreshScript,
  HeadElements,
  hwyInit,
  renderRoot,
} from "hwy";

const { app } = await hwyInit({
  app: createApp(),
  importMetaUrl: import.meta.url,
});

const defaultHeadBlocks = [
  { title: "bun-tester" },
  {
    tag: "meta",
    attributes: {
      charset: "UTF-8",
    },
  },
  {
    tag: "meta",
    attributes: {
      name: "viewport",
      content: "width=device-width,initial-scale=1",
    },
  },
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
              <HeadElements {...routeData} />
              <CssImports />
              <ClientScripts {...routeData} />
              <DevLiveRefreshScript />
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

const PORT = Number(process.env.PORT ?? 3000);
const webHandler = toWebHandler(app);
const server = Bun.serve({
  port: PORT,
  fetch(request: Request) {
    return webHandler(request);
  },
});
console.log(`Listening on http://${server.hostname}:${server.port}`);

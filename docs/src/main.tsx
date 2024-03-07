import { createApp, eventHandler, setResponseHeader, toNodeListener } from "h3";
import {
  ClientScripts,
  CssImports,
  DevLiveRefreshScript,
  HeadBlock,
  HeadElements,
  hwyInit,
  renderRoot,
} from "hwy";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { BodyInner } from "./components/body-inner.js";
import { make_emoji_data_url } from "./utils/utils.js";

const { app } = await hwyInit({
  app: createApp(),
  importMetaUrl: import.meta.url,
});

const defaultHeadBlocks: HeadBlock[] = [
  { title: "Hwy Framework" },
  {
    tag: "meta",
    attributes: {
      name: "description",
      content: "Hwy is a simple, lightweight, and flexible web framework.",
    },
  },
  {
    tag: "link",
    attributes: {
      rel: "icon",
      href: make_emoji_data_url("⭐"),
    },
  },
  {
    tag: "meta",
    attributes: {
      name: "og:image",
      content: "/create-hwy-snippet.webp",
    },
  },
];

app.use(
  "*",
  eventHandler(async (event) => {
    if (event.method === "GET") {
      setResponseHeader(event, "Cache-Control", "max-age=0, s-maxage=2678400");
    }
    return await renderRoot({
      event,
      defaultHeadBlocks,
      root: function (routeData) {
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

            <body>
              <BodyInner routeData={routeData} />
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

import { createApp, toWebHandler } from "h3";
import { hwyInit } from "hwy";
import { renderHtmlRoot } from "./html-root.js";

const { app } = await hwyInit({
  app: createApp(),
  importMetaUrl: import.meta.url,
});

app.use("/*", async (event) => renderHtmlRoot(event.path));

const PORT = Number(process.env.PORT ?? 3000);

const webHandler = toWebHandler(app);

const server = Bun.serve({
  port: PORT,
  fetch(request: Request) {
    return webHandler(request);
  },
});

console.log(`Listening on http://${server.hostname}:${server.port}`);

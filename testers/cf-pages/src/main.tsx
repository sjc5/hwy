import {
  hwyInit,
  CssImports,
  rootOutlet,
  hwyDev,
  ClientEntryScript,
  HeadElements,
  getDefaultBodyProps,
  renderRoot,
} from "hwy";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "hono/cloudflare-workers";
import { handle } from "hono/cloudflare-pages";

import process from "node:process";
globalThis.process = process;

// const app = new Hono();

// app.get("/hello", (c) => {
//   return c.json({
//     message: "Hello, Cloudflare Pages!",
//   });
// });

// export const onRequest = handle(app);

const app = new Hono();

await hwyInit({
  app,
  importMetaUrl: import.meta.url,
  // serveStatic: (() => {}) as any,
  watchExclusions: ["src/styles/tw-output.bundle.css"],
});

app.use("*", logger());
app.get("*", secureHeaders());

app.all("*", async (c, next) => {
  return await renderRoot(c, next, async ({ activePathData }) => {
    return (
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />

          <HeadElements
            c={c}
            activePathData={activePathData}
            defaults={[
              { title: "hwy-cf-test-2" },
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
                  }),
                },
              },
            ]}
          />

          <CssImports />
          <ClientEntryScript />

          {hwyDev?.DevLiveRefreshScript()}
        </head>

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
            {await rootOutlet({
              activePathData,
              c,
              fallbackErrorBoundary: () => {
                return <div>Something went wrong.</div>;
              },
            })}
          </main>
        </body>
      </html>
    );
  });
});

app.notFound((c) => c.text("404 Not Found", 404));

app.onError((error, c) => {
  console.error(error);
  return c.text("500 Internal Server Error", 500);
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// export const onRequest = handle(app);

export default app;

console.log(`\nListening on port ${PORT}\n`);

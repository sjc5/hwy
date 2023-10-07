import { Options } from "./types.js";
import { target_is_deno } from "./utils.js";

let imports = `
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
`.trim();

const node_imports = `
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
`.trim();

const deno_imports = `
import { serveStatic } from "hono/deno";
`.trim();

const bun_imports = `
import { serveStatic } from "hono/bun";
`.trim();

function get_main(options: Options) {
  const is_targeting_deno = target_is_deno(options);

  imports +=
    "\n" +
    (is_targeting_deno
      ? deno_imports
      : options.deployment_target === "bun"
      ? bun_imports
      : node_imports);

  if (options.deployment_target === "vercel") {
    imports =
      imports + "\n" + `import { handle } from "@hono/node-server/vercel";`;
  }

  return (
    imports.trim() +
    "\n\n" +
    (is_targeting_deno
      ? `const IS_DEV = Deno.env.get("IS_DEV");\n\n`
      : `const IS_DEV = process.env.NODE_ENV === "development";\n\n`) +
    `
const app = new Hono();

await hwyInit({
  app,
  importMetaUrl: import.meta.url,
  serveStatic,${
    options.css_preference === "tailwind"
      ? `\n  watchExclusions: ["src/styles/tw-output.bundle.css"],`
      : ""
  }
  isDev: IS_DEV,
});

app.use("*", logger());
app.get("*", secureHeaders());

app.all("*", async (c, next) => {${
      options.with_nprogress
        ? `\n  if (IS_DEV) await new Promise((r) => setTimeout(r, 150)); // simulate latency in dev\n`
        : ""
    }
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
              { title: "${options.project_name}" },
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

        <body
          {...getDefaultBodyProps(${
            options.with_nprogress ? "{ nProgress: true }" : ""
          })}
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
            {await rootOutlet({
              activePathData,
              c,
              fallbackErrorBoundary: () => {
                return <div>Something went wrong.</div>
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

${
  options.deployment_target === "vercel"
    ? serve_fn_vercel
    : is_targeting_deno
    ? serve_fn_deno
    : options.deployment_target === "bun"
    ? serve_fn_bun
    : serve_fn_node
}
`.trim() +
    "\n"
  );
}

export { get_main };

const serve_fn_deno = `
const PORT = Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : 8080;

Deno.serve({ port: PORT }, app.fetch);
`.trim();

const serve_fn_node = `
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(
    \`\\nListening on http://\${IS_DEV ? "localhost" : info.address}:\${PORT}\\n\`
  );
});
`.trim();

const serve_fn_vercel = `
if (IS_DEV) {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(\`\\nListening on http://localhost:\${PORT}\\n\`);
  });
}

export default handle(app);
`.trim();

const serve_fn_bun = `
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

console.log(\`\\nListening on http://\${server.hostname}:\${PORT}\\n\`);
`.trim();

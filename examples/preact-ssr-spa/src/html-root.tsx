import { H3Event } from "h3";
import { utils } from "hwy";
import { renderToString } from "preact-render-to-string";
import { PreactApp } from "./preact-app.js";

/* This file runs on the server only */

function renderHtmlRoot(path: string) {
  const criticalCss = utils.getCriticalCss();
  const refreshScript = utils.getRefreshScript();

  const html = (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />

        <title>Hwy Preact SSR SPA</title>

        {criticalCss && (
          <style
            id={utils.getCriticalCssElementId()}
            dangerouslySetInnerHTML={{ __html: criticalCss }}
          />
        )}

        <link rel="stylesheet" href={utils.getBundledCssUrl()} />

        <script type="module" src={utils.getClientEntryUrl()} />

        {refreshScript && (
          <script
            type="module"
            dangerouslySetInnerHTML={{ __html: refreshScript }}
          />
        )}
      </head>

      <body>
        <PreactApp path={path} />
      </body>
    </html>
  );

  return "<!DOCTYPE html>" + renderToString(html);
}

export { renderHtmlRoot };

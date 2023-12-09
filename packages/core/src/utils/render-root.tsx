import type { Context, Next } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { type JSX } from "preact";
import { renderToString } from "preact-render-to-string";
import { getPublicUrl } from "./hashed-public-url.js";
import type { HeadBlock } from "../types.js";
import { get_new_title } from "../components/head-elements.js";
import { get_hwy_global } from "./get-hwy-global.js";

type BaseProps = {
  c: Context;
  activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  defaultHeadBlocks?: HeadBlock[];
};

const USE_PREACT_COMPAT = false; // TODO

async function renderRoot({
  c,
  next,
  htmlAttributes,
  defaultHeadBlocks,
  head: Head,
  body: Body,
}: {
  c: Context;
  next: Next;
  defaultHeadBlocks?: HeadBlock[];
  htmlAttributes?: Record<string, string>;
  head: (baseProps: BaseProps) => JSX.Element;
  body: (baseProps: BaseProps) => JSX.Element;
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  const IS_PREACT = get_hwy_global().get("mode") === "preact-mpa";
  const base_props = { c, activePathData, defaultHeadBlocks };

  if (IS_PREACT) {
    if (c.req.raw.headers.get("Accept") === "application/json") {
      const newTitle = get_new_title({ c, activePathData, defaultHeadBlocks });

      if (c.req.raw.signal.aborted) {
        return;
      }

      return c.json({
        newTitle,
        head: renderToString(<Head {...base_props} />),
        activeData: activePathData.activeData,
        activePaths: activePathData.matchingPaths?.map((x) => {
          return getPublicUrl(
            "dist/" + x.importPath.slice(0, -3) + ".hydrate.js",
          );
        }),
        outermostErrorBoundaryIndex: activePathData.outermostErrorBoundaryIndex,
        errorToRender: activePathData.errorToRender,
        splatSegments: activePathData.splatSegments,
        params: activePathData.params,
        actionData: activePathData.actionData,
      });
    }
  }

  const markup = (
    <html {...htmlAttributes}>
      <Head {...base_props} />
      <Body {...base_props} />
    </html>
  );

  return c.html("<!doctype html>" + renderToString(markup));
}

export { renderRoot };

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

async function renderRoot({
  c,
  next,
  defaultHeadBlocks,
  root: Root,
}: {
  c: Context;
  next: Next;
  defaultHeadBlocks?: HeadBlock[];
  root: (baseProps: BaseProps) => JSX.Element;
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  const IS_PREACT = get_hwy_global().get("mode") === "preact-mpa";

  if (IS_PREACT) {
    if (c.req.raw.headers.get("Accept") === "application/json") {
      const newTitle = get_new_title({ c, activePathData, defaultHeadBlocks });

      if (c.req.raw.signal.aborted) {
        return;
      }

      return c.json({
        newTitle,
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

  const base_props = { c, activePathData, defaultHeadBlocks };
  const markup = <Root {...base_props} />;
  return c.html("<!doctype html>" + renderToString(markup));
}

export { renderRoot };

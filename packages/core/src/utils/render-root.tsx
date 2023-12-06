import type { Context, Next } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import type { JSX } from "preact";
import { renderToString } from "preact-render-to-string";
import { getPublicUrl } from "./hashed-public-url.js";
import type { HeadBlock } from "../types.js";
import { get_new_title } from "../components/head-elements.js";
import { get_hwy_global } from "./get-hwy-global.js";

function Test() {
  return <div>Test</div>;
}

export const IS_HWY_LOADER_FETCH_KEY = "__HWY__LOADER_FETCH__";

async function renderRoot({
  c,
  next,
  htmlProps,
  defaultHeadBlocks,
  head: Head,
  body: Body,
}: {
  c: Context;
  next: Next;
  htmlProps?: Record<string, string>;
  defaultHeadBlocks?: HeadBlock[];
  head: ({
    activePathData,
    defaultHeadBlocks,
  }: {
    activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
    defaultHeadBlocks?: HeadBlock[];
  }) => JSX.Element;
  body: ({
    activePathData,
  }: {
    activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  }) => JSX.Element;
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  const IS_PREACT = get_hwy_global().get("client_lib") === "preact";

  if (IS_PREACT) {
    if (c.req.query()[IS_HWY_LOADER_FETCH_KEY] || c.req.method !== "GET") {
      const newTitle = get_new_title({ c, activePathData, defaultHeadBlocks });

      return c.json({
        newTitle,
        head: renderToString(
          <html {...htmlProps}>
            {Head({
              activePathData,
              defaultHeadBlocks,
            })}
          </html>,
        ),
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
    <html {...htmlProps}>
      <Head activePathData={activePathData} />
      <Body activePathData={activePathData} />
    </html>
  );

  return c.html("<!doctype html>" + renderToString(markup));
}

export { renderRoot };

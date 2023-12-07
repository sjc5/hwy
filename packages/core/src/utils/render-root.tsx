import type { Context, Next } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { type JSX } from "preact";
import { renderToString } from "preact-render-to-string";
import { getPublicUrl } from "./hashed-public-url.js";
import type { HeadBlock } from "../types.js";
import { get_new_title } from "../components/head-elements.js";
import { get_hwy_global } from "./get-hwy-global.js";

function Test() {
  return <div>Test</div>;
}

export const IS_HWY_LOADER_FETCH_KEY = "__HWY__LOADER_FETCH__";

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
  head: (baseProps: BaseProps) => Promise<JSX.Element> | JSX.Element;
  body: (baseProps: BaseProps) => Promise<JSX.Element> | JSX.Element;
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  const IS_PREACT = get_hwy_global().get("client_lib") === "preact";

  const base_props = { c, activePathData, defaultHeadBlocks };

  if (IS_PREACT) {
    if (c.req.query()[IS_HWY_LOADER_FETCH_KEY] || c.req.method !== "GET") {
      const newTitle = get_new_title({ c, activePathData, defaultHeadBlocks });

      return c.json({
        newTitle,
        head: renderToString(await Head(base_props)),
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

  const [head, body] = await Promise.all([Head(base_props), Body(base_props)]);

  const markup = (
    <html {...htmlAttributes}>
      {head}
      {body}
    </html>
  );

  return c.html("<!doctype html>" + renderToString(markup));
}

export { renderRoot };

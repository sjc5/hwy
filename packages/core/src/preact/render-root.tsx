import { Context, Next } from "hono";
import { JSX } from "preact";
import { renderToString } from "preact-render-to-string";
import {
  BaseProps,
  HWY_PREFIX,
  HeadBlock,
  get_hwy_global,
  sort_head_blocks,
} from "../../../common/index.mjs";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { utils } from "../utils/hwy-utils.js";

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

  const IS_PREACT_MPA = Boolean(
    get_hwy_global().get("hwy_config").hydrateRouteComponents,
  );

  if (IS_PREACT_MPA) {
    const IS_JSON = Boolean(c.req.query()[`${HWY_PREFIX}json`]);

    if (IS_JSON) {
      const baseProps = { c, activePathData, defaultHeadBlocks };

      if (c.req.raw.signal.aborted) {
        return;
      }

      const headBlocks = utils.getHeadBlocks(baseProps);
      const { title, metaHeadBlocks, restHeadBlocks } =
        sort_head_blocks(headBlocks);

      return c.json({
        title,
        metaHeadBlocks,
        restHeadBlocks,
        activeData: activePathData.activeData,
        activePaths: activePathData.matchingPaths?.map((x) => {
          return utils.getPublicUrl(
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

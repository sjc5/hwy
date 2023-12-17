import { Context } from "hono";
import {
  HWY_PREFIX,
  HeadBlock,
  get_hwy_global,
  sort_head_blocks,
} from "../../../common/index.mjs";
import { getHeadElementProps } from "../components/head-elements-comp.js";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { utils } from "./hwy-utils.js";

export function get_is_json_request({ c }: { c: Context }) {
  return Boolean(c.req.query()[`${HWY_PREFIX}json`]);
}

async function getRouteData({
  c,
  defaultHeadBlocks,
}: {
  c: Context;
  defaultHeadBlocks: HeadBlock[];
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return null;
  }

  const IS_PREACT_MPA = Boolean(
    get_hwy_global().get("hwy_config").useClientSidePreact,
  );

  const headBlocks = utils.getExportedHeadBlocks({
    c,
    activePathData,
    defaultHeadBlocks,
  });

  const { title, metaHeadBlocks, restHeadBlocks } =
    sort_head_blocks(headBlocks);

  const baseProps = {
    c,
    activePathData,
    title,
    metaHeadBlocks,
    restHeadBlocks,
    defaultHeadBlocks,
  };

  if (IS_PREACT_MPA) {
    const IS_JSON = get_is_json_request({ c });

    if (IS_JSON) {
      if (c.req.raw.signal.aborted) {
        return;
      }

      return c.json({
        title,
        metaHeadBlocks,
        restHeadBlocks,
        activeData: activePathData.activeData,
        activePaths: activePathData.matchingPaths?.map((x) => {
          return utils.getPublicUrl(
            "dist/pages/" + x.importPath.replace(".js", ".page.js"),
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

  const headElementProps = getHeadElementProps(baseProps);

  return {
    ...baseProps,
    ...headElementProps,
  };
}

export { getRouteData };

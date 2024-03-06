import { defineEventHandler, getQuery, H3Event, type H3EventContext } from "h3";
import {
  get_hwy_global,
  HeadBlock,
  HWY_PREFIX,
  sort_head_blocks,
} from "../../../common/index.mjs";
import { getHeadElementProps } from "../components/head-elements-comp.js";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { utils } from "./hwy-utils.js";

export function get_is_json_request({ event }: { event: H3Event }) {
  return Boolean(getQuery(event)[`${HWY_PREFIX}json`]);
}

async function getRouteData({
  event,
  defaultHeadBlocks,
  adHocData,
}: {
  event: H3Event;
  defaultHeadBlocks: HeadBlock[];
  adHocData?: any;
}) {
  const activePathData = await getMatchingPathData({ event });
  console.log({ activePathData });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return null;
  }

  const hwy_global = get_hwy_global();

  const IS_PREACT_MPA = Boolean(
    hwy_global.get("hwy_config").useClientSidePreact,
  );

  const headBlocks = utils.getExportedHeadBlocks({
    event,
    activePathData,
    defaultHeadBlocks,
  });

  const { title, metaHeadBlocks, restHeadBlocks } =
    sort_head_blocks(headBlocks);

  const buildId = hwy_global.get("build_id");

  const baseProps = {
    event,
    activePathData,
    title,
    metaHeadBlocks,
    restHeadBlocks,
    defaultHeadBlocks,
    adHocData,
    buildId,
  };

  if (IS_PREACT_MPA) {
    const IS_JSON = get_is_json_request({ event });

    if (IS_JSON) {
      // COME BACK
      // if (c.req.raw.signal.aborted) {
      //   return;
      // }

      console.log("IS_JSON");

      return {
        title,
        metaHeadBlocks,
        restHeadBlocks,
        activeData: activePathData.activeData,
        activePaths: activePathData.matchingPaths
          ?.filter((x) => {
            return !x.isServerFile;
          })
          .map((x) => {
            return utils.getPublicUrl("dist/" + x.importPath);
          }),
        outermostErrorBoundaryIndex: activePathData.outermostErrorBoundaryIndex,
        splatSegments: activePathData.splatSegments,
        params: activePathData.params,
        actionData: activePathData.actionData,
        adHocData,
        buildId,
      };
    }
  }

  const headElementProps = getHeadElementProps(baseProps);

  return {
    ...baseProps,
    ...headElementProps,
  };
}

export { getRouteData };

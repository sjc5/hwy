import { getQuery, H3Event } from "h3";
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

  if (IS_PREACT_MPA && get_is_json_request({ event })) {
    if (
      event.web?.request?.signal.aborted ||
      event.node.req.closed ||
      event.handled
    ) {
      return;
    }
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

  return {
    ...baseProps,
    ...getHeadElementProps(baseProps),
  };
}

export { getRouteData };

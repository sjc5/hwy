import { AdHocData, getHwyGlobal, HWY_PREFIX } from "../../../common/index.mjs";
import {
  getMatchingPathData,
  GetRouteDataOutput,
  HeadBlock,
  SortHeadBlocksOutput,
} from "../router/router.js";
import { utils } from "./hwy-utils.js";

export function getIsJSONRequest(request: Request): boolean {
  const url = new URL(request.url);
  return Boolean(url.searchParams.get(`${HWY_PREFIX}json`));
}

function sortHeadBlocks(blocks: Array<HeadBlock>): SortHeadBlocksOutput {
  const result: SortHeadBlocksOutput = {
    title: "",
    metaHeadBlocks: [],
    restHeadBlocks: [],
  };
  for (const block of blocks) {
    if (block.tag === "title" && block.value) {
      result.title = block.value;
    } else if (block.tag === "meta") {
      result.metaHeadBlocks.push(block);
    } else {
      result.restHeadBlocks.push(block);
    }
  }
  return result;
}

export async function getRouteData({
  request,
  defaultHeadBlocks,
  adHocData,
}: {
  request: Request;
  defaultHeadBlocks: HeadBlock[];
  adHocData: AdHocData | undefined;
}): Promise<{
  response: Response | null;
  routeData: GetRouteDataOutput | null;
}> {
  const { activePathData, response } = await getMatchingPathData(request);

  if (response) {
    return { response, routeData: null };
  }

  if (!activePathData || !activePathData.matchingPaths?.length) {
    return { response: null, routeData: null };
  }

  const hwyGlobal = getHwyGlobal();

  const { title, metaHeadBlocks, restHeadBlocks } = sortHeadBlocks(
    utils.getExportedHeadBlocks({
      r: request,
      activePathData,
      defaultHeadBlocks,
    }),
  );
  const isJSON = getIsJSONRequest(request);

  return {
    response: null,
    routeData: {
      title: title,
      metaHeadBlocks: metaHeadBlocks,
      restHeadBlocks: restHeadBlocks,
      activeData: activePathData.activeData,
      activePaths: activePathData.activePaths,
      outermostErrorBoundaryIndex: activePathData.outermostErrorBoundaryIndex,
      splatSegments: activePathData.splatSegments,
      params: activePathData.params,
      actionData: activePathData.actionData,
      adHocData: adHocData ?? {},
      buildID: hwyGlobal.get("buildID"),
      activeComponents: isJSON ? null : activePathData.activeComponents,
      activeErrorBoundaries: isJSON
        ? null
        : activePathData.activeErrorBoundaries,
    },
  };
}

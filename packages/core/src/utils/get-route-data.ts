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
}): Promise<GetRouteDataOutput | null> {
  const activePathData = await getMatchingPathData(request);

  if (!activePathData.matchingPaths?.length) {
    return null;
  }

  const hwyGlobal = getHwyGlobal();

  const headBlocks = utils.getExportedHeadBlocks({
    r: request,
    activePathData,
    defaultHeadBlocks,
  });

  const { title, metaHeadBlocks, restHeadBlocks } = sortHeadBlocks(headBlocks);

  const buildID = hwyGlobal.get("buildID");

  const isJSON = getIsJSONRequest(request);

  return {
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
    buildID,
    activeComponents: isJSON ? null : activePathData.activeComponents,
    activeErrorBoundaries: isJSON ? null : activePathData.activeErrorBoundaries,
  } satisfies GetRouteDataOutput;
}

// activePaths: activePathData.matchingPaths
// ?.filter((x) => {
// 	return !x.isServerFile;
// })
// .map((x) => {
// 	return utils.getPublicUrl("dist/" + x.importPath);
// }),

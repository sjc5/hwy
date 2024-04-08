import { AdHocData, getHwyGlobal, HWY_PREFIX } from "../../../common/index.mjs";
import {
  getMatchingPathData,
  GetRouteDataOutput,
  HeadBlock,
} from "../router/router.js";
import { utils } from "./hwy-utils.js";

export function getIsJSONRequest(request: Request): boolean {
  const url = new URL(request.url);
  return Boolean(url.searchParams.get(`${HWY_PREFIX}json`));
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

  const { title, metaHeadBlocks, restHeadBlocks } = utils.getExportedHeadBlocks(
    { request, activePathData, defaultHeadBlocks },
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

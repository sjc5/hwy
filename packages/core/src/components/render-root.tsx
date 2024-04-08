import { AdHocData } from "../../../common/index.mjs";
import { GetRouteDataOutput, HeadBlock } from "../router/router.js";
import { getIsJSONRequest, getRouteData } from "../utils/get-route-data.js";

// __TODO Move defaultHeadBlocks earlier and cache, no need to be per-request

export async function renderRoot({
  request,
  defaultHeadBlocks,
  adHocData,
  renderCallback,
}: {
  request: Request;
  defaultHeadBlocks: HeadBlock[];
  adHocData?: AdHocData;
  renderCallback: (routeData: GetRouteDataOutput) => any;
}) {
  const { response, routeData } = await getRouteData({
    request,
    defaultHeadBlocks,
    adHocData,
  });
  if (response) {
    return response;
  }
  if (!routeData) {
    return;
  }
  if (getIsJSONRequest(request)) {
    return routeData;
  }
  return renderCallback(routeData);
}

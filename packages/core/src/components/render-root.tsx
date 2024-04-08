import { ReactElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { AdHocData } from "../../../common/index.mjs";
import { GetRouteDataOutput, HeadBlock } from "../router/router.js";
import { getIsJSONRequest, getRouteData } from "../utils/get-route-data.js";

export async function renderRoot({
  request,
  defaultHeadBlocks,
  root: Root,
  adHocData,
}: {
  request: Request;
  defaultHeadBlocks: HeadBlock[];
  root: (props: GetRouteDataOutput) => ReactElement;
  adHocData?: AdHocData;
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
  return renderToPipeableStream(<Root {...routeData} />);
}

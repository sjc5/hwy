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
  const a = performance.now();
  const maybeRootData = await getRouteData({
    request,
    defaultHeadBlocks,
    adHocData,
  });
  const b = performance.now();
  console.log(new URL(request.url).pathname);
  console.log(`getRouteData took ${b - a} ms`);
  if (!maybeRootData) {
    return;
  }
  if (getIsJSONRequest(request)) {
    return maybeRootData;
  }
  return renderToPipeableStream(<Root {...maybeRootData} />);
}

import { H3Event } from "h3";
import { ReactElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { HeadBlock, RouteData } from "../../../common/index.mjs";
import { getRouteData, get_is_json_request } from "../utils/get-root-data.js";

export async function renderRoot({
  event,
  defaultHeadBlocks,
  root: Root,
  adHocData,
}: {
  event: H3Event;
  defaultHeadBlocks: HeadBlock[];
  root: (props: RouteData) => ReactElement;
  adHocData?: any;
}) {
  const maybeRootData = await getRouteData({
    event,
    defaultHeadBlocks,
    adHocData,
  });
  if (!maybeRootData) {
    return;
  }
  if (!isRouteDataType(maybeRootData, event)) {
    return maybeRootData;
  }
  return renderToPipeableStream(<Root {...maybeRootData} />);
}

function isRouteDataType(x: any, event: H3Event): x is RouteData {
  return !(x instanceof Response) && !get_is_json_request(event);
}

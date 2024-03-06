import { H3Event } from "h3";
import { renderToString } from "preact-render-to-string";
import { HeadBlock, RouteData } from "../../../common/index.mjs";
import { getRouteData, get_is_json_request } from "../utils/get-root-data.js";

type JSXElement = any;

async function renderRoot({
  event,
  defaultHeadBlocks,
  root: Root,
  adHocData,
}: {
  event: H3Event;
  defaultHeadBlocks: HeadBlock[];
  root: (props: RouteData) => JSXElement;
  adHocData?: any;
}) {
  const routeData = await getRouteData({ event, defaultHeadBlocks, adHocData });

  // __TODO -- see if resource routes still work!
  if (routeData instanceof Response || get_is_json_request({ event })) {
    return routeData;
  }

  if (!routeData) {
    return;
  }

  return (
    "<!doctype html>" +
    renderToString(
      // @ts-ignore
      <Root {...routeData} />,
    )
  );
}

export { renderRoot };

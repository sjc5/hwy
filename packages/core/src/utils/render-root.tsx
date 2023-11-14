import type { HtmlEscapedString } from "hono/utils/html";
import type { Context, Next } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { html } from "hono/html";

async function renderRoot(
  c: Context,
  next: Next,
  RootMarkup: ({
    activePathData,
  }: {
    activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  }) => Promise<HtmlEscapedString>,
) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  return c.html(
    html`<!doctype html>${(<RootMarkup activePathData={activePathData} />)}`,
  );
}

export { renderRoot };

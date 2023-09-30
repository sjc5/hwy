import type { HtmlEscapedString } from "hono/utils/html";
import type { Context, Next } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";

async function renderRoot(
  c: Context,
  next: Next,
  rootMarkup: ({
    activePathData,
  }: {
    activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  }) => Promise<HtmlEscapedString>
) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  const markup = await rootMarkup({ activePathData });

  return c.html(`<!DOCTYPE html>` + markup);
}

export { renderRoot };

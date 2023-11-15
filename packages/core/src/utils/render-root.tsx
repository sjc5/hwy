import type { Context, Next } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { html } from "hono/html";
import { renderToReadableStream, Suspense } from "hono/jsx/streaming";

async function renderRoot({
  c,
  next,
  root: Root,
  shouldStream,
}: {
  c: Context;
  next: Next;
  root: ({
    activePathData,
  }: {
    activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  }) => JSX.Element;
  shouldStream?: boolean;
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  if (shouldStream === false) {
    return c.html(
      html`<!doctype html>${(<Root activePathData={activePathData} />)}`,
    );
  }

  const readable_stream = renderToReadableStream(
    html`<!doctype html>${(<Root activePathData={activePathData} />)}`,
  );

  c.header("Content-Type", "text/html; charset=utf-8");
  c.header("Transfer-Encoding", "chunked");

  return c.body(readable_stream);
}

export { renderRoot };

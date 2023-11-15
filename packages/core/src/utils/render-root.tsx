import type { Context, Next } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { html } from "hono/html";
import { renderToReadableStream } from "hono/jsx/streaming";

async function renderRoot({
  c,
  next,
  root: Root,
  useStreaming,
}: {
  c: Context;
  next: Next;
  root: ({
    activePathData,
  }: {
    activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  }) => JSX.Element;
  useStreaming?: boolean;
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  if (useStreaming) {
    const readable_stream = renderToReadableStream(
      html`<!doctype html>${(<Root activePathData={activePathData} />)}`,
    );

    c.header("Content-Type", "text/html; charset=utf-8");
    c.header("Transfer-Encoding", "chunked");

    return c.body(readable_stream);
  }

  return c.html(
    html`<!doctype html>${(<Root activePathData={activePathData} />)}`,
  );
}

export { renderRoot };

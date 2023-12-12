import type { Context, Next } from "hono";
import { BaseProps, HeadBlock } from "../../common/index.mjs";
import { getMatchingPathData } from "hwy";
import { html } from "hono/html";
import { renderToReadableStream } from "hono/jsx/streaming";

async function honoRenderRoot({
  c,
  next,
  defaultHeadBlocks,
  root: Root,
  experimentalStreaming,
}: {
  c: Context;
  next: Next;
  defaultHeadBlocks?: HeadBlock[];
  root: (baseProps: BaseProps) => JSX.Element;
  experimentalStreaming?: boolean;
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  const base_props = { c, activePathData, defaultHeadBlocks };

  if (experimentalStreaming) {
    const readable_stream = renderToReadableStream(
      html`<!doctype html>${(<Root {...base_props} />)}`,
    );

    c.header("Content-Type", "text/html; charset=utf-8");
    c.header("Transfer-Encoding", "chunked");

    return c.body(readable_stream);
  }

  return c.html(html`<!doctype html>${(<Root {...base_props} />)}`);
}

export { honoRenderRoot };

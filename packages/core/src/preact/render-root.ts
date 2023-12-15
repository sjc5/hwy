import { Context, Next } from "hono";
import { renderToString } from "preact-render-to-string";
import {
  BaseProps,
  HWY_PREFIX,
  HeadBlock,
  get_hwy_global,
  sort_head_blocks,
} from "../../../common/index.mjs";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { utils } from "../utils/hwy-utils.js";
import { getHeadElementProps } from "./head-elements-comp.js";

async function renderRoot<JSXElement>({
  c,
  next,
  defaultHeadBlocks,
  root: Root,
  jsxImportSource,
}: {
  c: Context;
  next: Next;
  defaultHeadBlocks: HeadBlock[];
  root: (
    baseProps: BaseProps & ReturnType<typeof getHeadElementProps>,
  ) => JSXElement;
  jsxImportSource?: "hono/jsx" | "preact";
}) {
  const activePathData = await getMatchingPathData({ c });

  if (activePathData.fetchResponse) {
    return activePathData.fetchResponse;
  }

  if (!activePathData.matchingPaths?.length) {
    return await next();
  }

  const IS_PREACT_MPA = Boolean(
    get_hwy_global().get("hwy_config").useClientSidePreact,
  );

  const headBlocks = utils.getExportedHeadBlocks({
    c,
    activePathData,
    defaultHeadBlocks,
  });

  const { title, metaHeadBlocks, restHeadBlocks } =
    sort_head_blocks(headBlocks);

  const baseProps = {
    c,
    activePathData,
    title,
    metaHeadBlocks,
    restHeadBlocks,
    defaultHeadBlocks,
  };

  if (IS_PREACT_MPA) {
    const IS_JSON = Boolean(c.req.query()[`${HWY_PREFIX}json`]);

    if (IS_JSON) {
      if (c.req.raw.signal.aborted) {
        return;
      }

      return c.json({
        title,
        metaHeadBlocks,
        restHeadBlocks,
        activeData: activePathData.activeData,
        activePaths: activePathData.matchingPaths?.map((x) => {
          return utils.getPublicUrl(
            "dist/pages/" + x.importPath.replace(".js", ".page.js"),
          );
        }),
        outermostErrorBoundaryIndex: activePathData.outermostErrorBoundaryIndex,
        errorToRender: activePathData.errorToRender,
        splatSegments: activePathData.splatSegments,
        params: activePathData.params,
        actionData: activePathData.actionData,
      });
    }
  }

  const headElementProps = getHeadElementProps(baseProps);

  const markup = Root({
    ...baseProps,
    ...headElementProps,
  });

  if (jsxImportSource === "hono/jsx") {
    return c.html("<!doctype html>" + markup);
  }

  return c.html("<!doctype html>" + renderToString(markup as any));
}

export { renderRoot };

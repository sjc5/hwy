import { Context } from "hono";
import { getMatchingPathData } from "../router/get-matching-path-data.js";
import { HeadFunction, HeadBlock } from "../types.js";
import type { HtmlEscapedString } from "hono/utils/html";

function stable_hash(obj: Record<string, any>): string {
  return JSON.stringify(
    Object.keys(obj)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = obj[key];
          return result;
        },
        {} as Record<string, any>,
      ),
  );
}

function dedupe_head_blocks(head_blocks: HeadBlock[]): HeadBlock[] {
  const results = new Map<any, HeadBlock>();

  for (let i = 0; i < head_blocks.length; i++) {
    const block = head_blocks[i];

    if ("title" in block) {
      results.set("title", block);
    } else if (block.tag === "meta") {
      const name = block.props.name;
      const property = block.props.property;

      if (name) {
        results.set("__meta__" + name, block);
      } else if (property) {
        results.set("__meta__" + property, block);
      } else {
        results.set(stable_hash(block), block);
      }
    } else {
      results.set(stable_hash(block), block);
    }
  }

  return [...results.values()];
}

function get_head_blocks_array(props: {
  activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  c: Context;
  defaults?: HeadBlock[];
}): HeadBlock[] {
  const { activePathData: active_path_data } = props;

  const non_deduped =
    active_path_data?.activeHeads?.flatMap((head: HeadFunction, i) => {
      const current_active_path = active_path_data?.activePaths?.[i];
      if (!current_active_path) return [];
      const current_data = active_path_data?.activeData?.[i];
      return head({
        path: current_active_path,
        loaderData: current_data,
        actionData: active_path_data.actionData,
        c: props.c,
        params: active_path_data?.matchingPaths?.[i].params,
        splatSegments: active_path_data?.matchingPaths?.[i].splatSegments,
      });
    }) ?? [];

  const defaults = props.defaults ?? [];

  const heads = [...defaults, ...non_deduped];

  return dedupe_head_blocks(heads);
}

function HeadElements(props: {
  activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
  c: Context;
  defaults?: HeadBlock[];
}): HtmlEscapedString {
  const head_blocks = get_head_blocks_array(props);

  return (
    <>
      {head_blocks.map((block, i) => {
        if ("title" in block) {
          return <title key={i}>{block.title}</title>;
        } else {
          return <block.tag key={i} {...block.props} />;
        }
      })}
    </>
  );
}

export { HeadElements };

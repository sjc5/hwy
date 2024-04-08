import { ActivePathData, HeadBlock } from "../router/router.js";

function stableHash(obj: Record<string, any>): string {
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

function dedupeHeadBlocks(headBlocks: HeadBlock[]): HeadBlock[] {
  const results = new Map<any, HeadBlock>();

  for (let i = 0; i < headBlocks.length; i++) {
    const block = headBlocks[i];

    if (block.tag === "title") {
      results.set("title", block);
    } else if (block.tag === "meta") {
      const name = block.attributes?.name;
      if (name === "description") {
        results.set("description", block);
      } else {
        results.set(stableHash(block), block);
      }
    } else {
      results.set(stableHash(block), block);
    }
  }

  return [...results.values()];
}

type GetExportedHeadBlocksProps = {
  r: Request;
  activePathData: ActivePathData;
  defaultHeadBlocks: Array<HeadBlock>;
};

function getExportedHeadBlocks({
  r,
  activePathData,
  defaultHeadBlocks,
}: GetExportedHeadBlocksProps): Array<HeadBlock> {
  const nonDeduped =
    activePathData?.activeHeads?.flatMap((head, i) => {
      const currentActivePath = activePathData?.activePaths?.[i];

      if (!currentActivePath) {
        return [];
      }

      const currentData = activePathData?.activeData?.[i];

      return (
        head?.({
          loaderData: currentData,
          actionData: activePathData.actionData,
          dataProps: {
            request: r,
            params: activePathData.params,
            splatSegments: activePathData.splatSegments,
          },
        }) ?? []
      );
    }) ?? [];

  const defaults = defaultHeadBlocks ?? [];
  const heads = [...defaults, ...nonDeduped.flat()];

  return dedupeHeadBlocks(heads);
}

export { getExportedHeadBlocks };

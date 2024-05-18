const markerCache: Record<
  string,
  { startComment: Comment | null; endComment: Comment | null }
> = {};

function removeAllBetween(type: "meta" | "rest") {
  const { startComment, endComment } = getStartAndEndComments(type);
  if (!startComment || !endComment) {
    return;
  }

  let currentNode = startComment.nextSibling as Node | null;

  while (currentNode && currentNode !== endComment) {
    const nextNode = currentNode.nextSibling;
    currentNode.parentNode?.removeChild(currentNode);
    currentNode = nextNode;
  }
}

function addBlocks(type: "meta" | "rest", blocks: Array<any>) {
  const { startComment, endComment } = getStartAndEndComments(type);
  if (!startComment || !endComment) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const block of blocks) {
    let newEl: HTMLElement | null = null;

    if (block.title) {
      newEl = document.createElement("title");
      newEl.textContent = block.title;
    } else if (block.tag) {
      newEl = document.createElement(block.tag);
      if (newEl && block.attributes) {
        for (const key of Object.keys(block.attributes)) {
          newEl.setAttribute(key, block.attributes[key]);
        }
      }
    }

    if (newEl) {
      fragment.appendChild(newEl);
    }
  }

  endComment.parentNode?.insertBefore(fragment, endComment);
}

export const head = {
  addBlocks,
  removeAllBetween,
} as const;

function getStartAndEndComments(type: "meta" | "rest") {
  if (!markerCache[type]) {
    markerCache[type] = {
      startComment: findComment(`data-hwy="${type}-start"`),
      endComment: findComment(`data-hwy="${type}-end"`),
    };
  }
  return markerCache[type];
}

function findComment(matchingText: string) {
  const iterator = document.createNodeIterator(
    document.head,
    NodeFilter.SHOW_COMMENT,
    {
      acceptNode(node: Comment) {
        return node.nodeValue?.trim() === matchingText
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );
  return iterator.nextNode() as Comment | null;
}

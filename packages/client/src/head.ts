function removeAllBetween(type: "meta" | "rest") {
  const { startElement, endElement } = getStartAndEndElements(type);
  if (!startElement || !endElement) {
    return;
  }

  let currentElement = startElement.nextSibling as HTMLElement | null;

  while (currentElement && currentElement !== endElement) {
    const nextElement = currentElement.nextSibling;
    currentElement.remove();
    currentElement = nextElement as HTMLElement | null;
  }
}

function addBlocks(type: "meta" | "rest", blocks: Array<any>) {
  const { startElement, endElement } = getStartAndEndElements(type);
  if (!startElement || !endElement) {
    return;
  }

  for (const block of blocks) {
    let newElement: HTMLElement | null = null;

    if (block.title) {
      newElement = document.createElement("title");
      newElement.textContent = block.title;
    } else if (block.tag) {
      newElement = document.createElement(block.tag);
      if (block.attributes) {
        for (const key of Object.keys(block.attributes)) {
          (newElement as HTMLElement).setAttribute(key, block.attributes[key]);
        }
      }
    }

    if (newElement) {
      document.head.insertBefore(newElement, endElement);
    }
  }
}

export const head = {
  addBlocks,
  removeAllBetween,
} as const;

function getStartAndEndElements(type: "meta" | "rest") {
  const startElement = document.head.querySelector(
    `[data-hwy="${type}-start"]`,
  );
  const endElement = document.head.querySelector(`[data-hwy="${type}-end"]`);
  return { startElement, endElement };
}

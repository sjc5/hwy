import type { HeadBlock } from "../../common/index.mjs";

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

function addBlocks(type: "meta" | "rest", blocks: Array<HeadBlock>) {
	const { startComment, endComment } = getStartAndEndComments(type);
	if (!startComment || !endComment) {
		return;
	}

	const fragment = document.createDocumentFragment();

	for (const block of blocks) {
		if (!block.tag) {
			continue;
		}

		const newEl = document.createElement(block.tag);

		if (block.safeAttributes) {
			for (const key of Object.keys(block.safeAttributes)) {
				newEl.setAttribute(key, block.safeAttributes[key]);
			}
		}

		if (block.booleanAttributes) {
			for (const key of block.booleanAttributes) {
				newEl.setAttribute(key, "");
			}
		}

		if (block.innerHTML) {
			newEl.innerHTML = block.innerHTML;
		}

		fragment.appendChild(newEl);
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

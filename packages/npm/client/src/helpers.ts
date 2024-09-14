export function getIsErrorRes(response: Response) {
	return (
		String(response.status).startsWith("4") ||
		String(response.status).startsWith("5")
	);
}

export function getIsGETRequest(requestInit?: RequestInit) {
	return (
		!requestInit?.method ||
		requestInit.method.toLowerCase() === "get" ||
		requestInit.method.toLowerCase() === "head"
	);
}

export function getIsInternalLink(href: string) {
	try {
		if (!href.startsWith("http://") && !href.startsWith("https://")) {
			return true;
		}
		const linkURL = new URL(href);
		const currentOrigin = window.location.origin;
		return linkURL.origin === currentOrigin;
	} catch {
		console.error("Invalid URL:", href);
		return false;
	}
}

export function getShouldPreventLinkDefault(event: MouseEvent) {
	const anchor = (event.target as HTMLElement).closest("a");

	const shouldPreventDefault =
		anchor && // ignore clicks with no anchor
		anchor.target !== "_blank" && // ignore new tabs
		event.button !== 1 && // middle mouse button click
		!anchor.href.startsWith("#") && // ignore hash links
		!anchor.hasAttribute("download") && // ignore downloads
		!event.ctrlKey && // ignore ctrl+click
		!event.shiftKey && // ignore shift+click
		!event.metaKey && // ignore cmd+click
		!event.altKey && // ignore alt+click
		getIsInternalLink(anchor.href); // ignore external links

	return shouldPreventDefault;
}

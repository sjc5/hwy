import { HWY_JSON_SEARCH_PARAM_KEY } from "../../common/index.mjs";

export function getAbsoluteURL(href: string): {
	absoluteURL: string;
	isExternal: boolean;
} {
	if (!href) {
		return { absoluteURL: "", isExternal: false };
	}

	let url: URL;

	try {
		url = new URL(href, window.location.href);
	} catch {
		return { absoluteURL: "", isExternal: false };
	}

	if (url.origin !== window.location.origin) {
		return { absoluteURL: url.href, isExternal: true };
	}

	// Filters out things like "#", "tel:", "mailto:", etc.
	if (url.protocol.startsWith("http")) {
		url.searchParams.set(HWY_JSON_SEARCH_PARAM_KEY, "1");

		return {
			absoluteURL: url.href,
			isExternal: false,
		};
	}

	return { absoluteURL: "", isExternal: false };
}

export function getPrefetchHandlers(href: string, timeout = 50) {
	const { absoluteURL, isExternal } = getAbsoluteURL(href);
	if (!absoluteURL || isExternal) {
		return;
	}

	let timer: number | undefined;

	return {
		absoluteURL,
		isExternal,
		start() {
			timer = setTimeout(() => prefetch(absoluteURL), timeout);
		},
		stop() {
			document.querySelector(`link[href="${absoluteURL}"]`)?.remove();
			clearTimeout(timer);
		},
	};
}

export function prefetch(absoluteURL: string) {
	document.querySelector(`link[href="${absoluteURL}"]`)?.remove();

	const link = document.createElement("link");
	link.rel = "prefetch";
	link.href = absoluteURL;
	link.id = absoluteURL;

	document.head.appendChild(link);
}

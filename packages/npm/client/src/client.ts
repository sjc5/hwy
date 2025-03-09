import {
	getAnchorDetailsFromEvent,
	getHrefDetails,
	getIsErrorRes,
	getIsGETRequest,
} from "@sjc5/kit/url";
import { type Update, createBrowserHistory } from "history";

/////////////////////////////////////////////////////////////////////
// COMMON
/////////////////////////////////////////////////////////////////////

const HWY_PREFIX = "__hwy_internal__";
const HWY_JSON_SEARCH_PARAM_KEY = "hwy_json";
const HWY_SYMBOL = Symbol.for(HWY_PREFIX);
const HWY_ROUTE_CHANGE_EVENT_KEY = "hwy:route-change";

type HwyClientGlobal = {
	isDev: boolean;
	loadersData: Array<any>;
	importURLs: Array<string>;
	outermostErrorIndex: number;
	splatValues: Array<string>;
	params: Record<string, string>;
	activeComponents: Array<any>;
	activeErrorBoundaries: Array<any>;
	coreData: any;
	buildID: string;
	viteDevURL: string;
};

type HwyClientGlobalKey = keyof HwyClientGlobal;

export function getRawCtx() {
	return (globalThis as any)[HWY_SYMBOL];
}

export function __getHwyClientGlobal() {
	const dangerousGlobalThis = globalThis as any;

	function get<K extends HwyClientGlobalKey>(key: K) {
		return dangerousGlobalThis[HWY_SYMBOL][key] as HwyClientGlobal[K];
	}

	function set<K extends HwyClientGlobalKey, V extends HwyClientGlobal[K]>(key: K, value: V) {
		dangerousGlobalThis[HWY_SYMBOL][key] = value;
	}

	return { get, set };
}

// __TODO set up go/ts type sharing script
type HeadBlock = {
	tag?: string;
	safeAttributes?: Record<string, string>;
	booleanAttributes?: Array<string>;
	innerHTML?: string;
};

type GetRouteDataOutput<RD = any> = {
	title: string;
	metaHeadBlocks: Array<HeadBlock>;
	restHeadBlocks: Array<HeadBlock>;
	loadersData: Array<any>;
	importURLs: Array<string>;
	outermostErrorIndex: number;
	splatValues: Array<string>;
	params: Record<string, string>;
	coreData: RD;
	buildID: string;
	deps: Array<string>;
	cssBundles: Array<string>;
	clientRedirectURL: string | null;

	// SSR Only
	activeErrorBoundaries: Array<any> | null;
	activeComponents: Array<any> | null;
};

type ScrollState = { x: number; y: number };
type RouteChangeEventDetail = {
	scrollState?: ScrollState;
	index?: number;
};
export type RouteChangeEvent = CustomEvent<RouteChangeEventDetail>;

// __TODO get rid of any remaining magic strings

/////////////////////////////////////////////////////////////////////
// NAVIGATION TYPES AND GLOBAL STATE
/////////////////////////////////////////////////////////////////////

type NavigationResult = { json: GetRouteDataOutput; props: NavigateProps } | undefined;

export type NavigationControl = {
	abortController: AbortController | undefined;
	promise: Promise<NavigationResult>;
};

type NavigationType =
	| "browserHistory"
	| "userNavigation"
	| "revalidation"
	| "dev-revalidation"
	| "redirect"
	| "prefetch";

export type NavigateProps = {
	href: string;
	navigationType: NavigationType;
	scrollStateToRestore?: ScrollState;
	replace?: boolean;
};

export const navigationState = {
	navigations: new Map<
		string,
		{
			control: NavigationControl;
			type: NavigationType;
		}
	>(),
	activeUserNavigation: null as string | null,
	submissions: new Map<
		string,
		{
			controller: AbortController;
			type: "submission";
		}
	>(),
};

/////////////////////////////////////////////////////////////////////
// NAVIGATION UTILS
/////////////////////////////////////////////////////////////////////

async function __navigate(props: NavigateProps) {
	const x = beginNavigation(props);
	if (!x.promise) {
		return;
	}

	const res = await x.promise;
	if (!res) {
		return;
	}

	await __completeNavigation(res);
}

export function beginNavigation(props: NavigateProps): NavigationControl {
	setStatus({ type: props.navigationType, value: true });

	// If this is a user navigation, abort any existing user navigation
	if (props.navigationType === "userNavigation") {
		// Abort all other navigations
		abortAllNavigationsExcept(props.href);
		navigationState.activeUserNavigation = props.href;

		// Check if we have an existing prefetch we can upgrade
		const existing = navigationState.navigations.get(props.href);
		if (existing && existing.type === "prefetch") {
			existing.type = "userNavigation";
			return existing.control;
		}
	}

	// For prefetches, check if one already exists
	if (props.navigationType === "prefetch") {
		const existing = navigationState.navigations.get(props.href);
		if (existing) {
			return existing.control;
		}
	}

	const controller = new AbortController();
	const control: NavigationControl = {
		abortController: controller,
		promise: __fetchRouteData(controller, props),
	};

	navigationState.navigations.set(props.href, {
		control,
		type: props.navigationType,
	});

	return control;
}

async function __completeNavigation({
	json,
	props,
}: {
	json: GetRouteDataOutput;
	props: NavigateProps;
}) {
	try {
		await __reRenderApp({
			json,
			navigationType: props.navigationType,
			runHistoryOptions: props,
		});
		setStatus({ type: props.navigationType, value: false });
	} catch (error) {
		handleNavError(error, props);
	}
}

async function __fetchRouteData(
	controller: AbortController,
	props: NavigateProps,
): Promise<NavigationResult | undefined> {
	try {
		const url = new URL(props.href, window.location.origin);
		url.searchParams.set(HWY_JSON_SEARCH_PARAM_KEY, "1");

		const { response, didRedirect } = await handleRedirects({
			abortController: controller,
			url,
		});

		if (didRedirect || !response || (!response.ok && response.status !== 304)) {
			setStatus({ type: props.navigationType, value: false });
			return;
		}

		const json = await response.json();
		if (!json) throw new Error("No JSON response");

		return { json, props };
	} catch (error) {
		if (!isAbortError(error)) {
			LogError("Navigation failed", error);
			setStatus({ type: props.navigationType, value: false });
		}
	} finally {
		navigationState.navigations.delete(props.href);
		if (navigationState.activeUserNavigation === props.href) {
			navigationState.activeUserNavigation = null;
		}
	}
}

function abortNavigation(href: string) {
	const nav = navigationState.navigations.get(href);
	if (nav) {
		nav.control.abortController?.abort();
		navigationState.navigations.delete(href);
	}
}

function abortAllNavigationsExcept(excludeHref?: string) {
	for (const [href, nav] of navigationState.navigations.entries()) {
		if (href !== excludeHref) {
			nav.control.abortController?.abort();
			navigationState.navigations.delete(href);
		}
	}
}

function handleNavError(error: unknown, props: NavigateProps) {
	if (!isAbortError(error)) {
		LogError(error);
		setStatus({ type: props.navigationType, value: false });
	}
}

/////////////////////////////////////////////////////////////////////
// PREFETCH
/////////////////////////////////////////////////////////////////////

type GetPrefetchHandlersInput<E extends Event> = LinkClickListenerCallbacksBase<E> & {
	href: string;
	timeout?: number;
};

export function getPrefetchHandlers<E extends Event>(input: GetPrefetchHandlersInput<E>) {
	const hrefDetails = getHrefDetails(input.href);
	if (!hrefDetails.isHTTP || !hrefDetails.relativeURL || hrefDetails.isExternal) {
		return;
	}

	let timer: number | undefined;
	let currentNav: NavigationControl | null = null;
	let prerenderResult: NavigationResult | null = null;

	async function finalize(e: E) {
		try {
			if (!prerenderResult && currentNav) {
				prerenderResult = await currentNav.promise;
			}
			if (prerenderResult) {
				await input.beforeRender?.(e);

				await __completeNavigation({
					json: prerenderResult.json,
					props: { ...prerenderResult.props, navigationType: "userNavigation" },
				});

				await input.afterRender?.(e);
			}
		} catch (e) {
			if (!isAbortError(e)) {
				LogError("Error finalizing prefetch", e);
			}
		} finally {
			prerenderResult = null;
			currentNav = null;
		}
	}

	async function prefetch(e: E) {
		if (currentNav || !hrefDetails.isHTTP) {
			return;
		}

		await input.beforeBegin?.(e);

		currentNav = beginNavigation({
			href: hrefDetails.relativeURL,
			navigationType: "prefetch",
		});

		currentNav.promise
			.then((result) => {
				prerenderResult = result;
			})
			.catch((error) => {
				if (!isAbortError(error)) {
					LogError("Prefetch failed", error);
				}
			});
	}

	function start(e: E) {
		if (currentNav) {
			return;
		}
		timer = window.setTimeout(() => prefetch(e), input.timeout);
	}

	function stop() {
		clearTimeout(timer);

		if (!hrefDetails.isHTTP) {
			return;
		}

		// Only abort if it's a prefetch, not a user navigation
		const nav = navigationState.navigations.get(hrefDetails.relativeURL);
		if (nav?.type === "prefetch") {
			abortNavigation(hrefDetails.relativeURL);
		}

		// Ensure future prefetches can occur
		currentNav = null;
		prerenderResult = null;
	}

	async function onClick(e: E) {
		if (e.defaultPrevented || !hrefDetails.isHTTP) {
			return;
		}

		e.preventDefault();
		setStatus({ type: "userNavigation", value: true });

		if (prerenderResult) {
			await finalize(e); // Use the preloaded result directly
			return;
		}

		await input.beforeBegin?.(e);

		const nav = beginNavigation({
			href: hrefDetails.relativeURL,
			navigationType: "userNavigation",
		});

		currentNav = nav;
		prerenderResult = null;

		try {
			await finalize(e);
		} catch (error) {
			if (!isAbortError(error)) {
				LogError("Error during navigation", error);
			}
		}
	}

	return {
		...hrefDetails,
		start,
		stop,
		onClick,
		addEventListeners(link: HTMLAnchorElement) {
			link.addEventListener("pointerenter", start as any);
			link.addEventListener("focus", start as any);
			link.addEventListener("pointerleave", stop);
			link.addEventListener("blur", stop);
			link.addEventListener("click", onClick as any);
		},
		removeEventListeners(link: HTMLAnchorElement) {
			link.removeEventListener("pointerenter", start as any);
			link.removeEventListener("focus", start as any);
			link.removeEventListener("pointerleave", stop);
			link.removeEventListener("blur", stop);
			link.removeEventListener("click", onClick as any);
		},
	};
}

/////////////////////////////////////////////////////////////////////
// REDIRECTS
/////////////////////////////////////////////////////////////////////

async function handleRedirects(props: {
	abortController: AbortController;
	url: URL;
	requestInit?: RequestInit;
}): Promise<{
	didRedirect: boolean;
	response?: Response;
}> {
	let res: Response | undefined;
	const bodyParentObj: RequestInit = {};

	if (
		props.requestInit &&
		(props.requestInit.body !== undefined || !getIsGETRequest(props.requestInit))
	) {
		if (props.requestInit.body instanceof FormData || typeof props.requestInit.body === "string") {
			bodyParentObj.body = props.requestInit.body;
		} else {
			bodyParentObj.body = JSON.stringify(props.requestInit.body);
		}
	}

	try {
		res = await fetch(props.url, {
			signal: props.abortController.signal,
			...props.requestInit,
			...bodyParentObj,
		});

		if (res?.redirected) {
			const newURL = new URL(res.url);

			const hrefDetails = getHrefDetails(newURL.href);

			if (!hrefDetails.isHTTP) {
				return { didRedirect: false, response: res };
			}

			if (!hrefDetails.isInternal) {
				// external link, hard redirecting
				window.location.href = newURL.href;
				return { didRedirect: true, response: res };
			}

			// internal link, soft redirecting
			await __navigate({
				href: newURL.href,
				navigationType: "redirect",
			});

			return { didRedirect: true, response: res };
		}
	} catch (error) {
		// If this was an attempted redirect,
		// potentially a CORS error here
		// Recommend returning a JSON instruction to redirect on client
		// with window.location.href = newURL.href;
		if (!isAbortError(error)) {
			LogError(error);
		}
	}

	return { didRedirect: false, response: res };
}

/////////////////////////////////////////////////////////////////////
// SUBMISSIONS / MUTATIONS
/////////////////////////////////////////////////////////////////////

function handleSubmissionController(key: string) {
	// Abort existing submission if it exists
	const existing = navigationState.submissions.get(key);
	if (existing) {
		existing.controller.abort();
		navigationState.submissions.delete(key);
	}

	const controller = new AbortController();
	navigationState.submissions.set(key, {
		controller,
		type: "submission",
	});

	return { abortController: controller, didAbort: !!existing };
}

export async function submit<T = any>(
	url: string | URL,
	requestInit?: RequestInit,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
	const submitRes = await submitInner(url, requestInit);

	if (!submitRes.success) {
		LogError(submitRes.error);
		return { success: false, error: submitRes.error };
	}

	try {
		const json = await submitRes.response.json();

		const error = "error" in json ? json.error : undefined;
		if (error) {
			LogError(error);
			return { success: false, error: error };
		}

		if (!submitRes.alreadyRevalidated && !getIsGETRequest(requestInit)) {
			await revalidate();
		}

		return {
			success: true,
			data: json.data as T,
		};
	} catch (e) {
		return {
			success: false,
			error: e instanceof Error ? e.message : "Unknown error",
		};
	}
}

async function submitInner(
	url: string | URL,
	requestInit?: RequestInit,
): Promise<
	({ success: true; response: Response } | { success: false; error: string }) & {
		alreadyRevalidated?: boolean;
	}
> {
	setStatus({ type: "submission", value: true });

	const urlStr = typeof url === "string" ? url : url.href;
	const submissionKey = urlStr + (requestInit?.method || "");
	const { abortController, didAbort } = handleSubmissionController(submissionKey);

	const urlToUse = new URL(url, window.location.origin);
	urlToUse.searchParams.set(HWY_JSON_SEARCH_PARAM_KEY, "1");

	if (!requestInit) {
		requestInit = {};
	}
	const headers = new Headers(requestInit.headers);
	headers.set("X-Hwy-Action", "1");
	requestInit.headers = headers;

	try {
		const { response, didRedirect } = await handleRedirects({
			abortController,
			url: urlToUse,
			requestInit,
		});

		navigationState.submissions.delete(submissionKey);

		if (response && getIsErrorRes(response)) {
			setStatus({ type: "submission", value: false });
			return {
				success: false,
				error: String(response.status),
				alreadyRevalidated: didRedirect || undefined,
			} as const;
		}

		if (didAbort) {
			if (!getIsGETRequest(requestInit)) {
				// resets status bool
				await revalidate();
			}
			return {
				success: false,
				error: "Aborted",
				alreadyRevalidated: true,
			} as const;
		}

		if (!response?.ok) {
			const msg = String(response?.status || "unknown");
			return {
				success: false,
				error: msg,
				alreadyRevalidated: didRedirect || undefined,
			} as const;
		}

		setStatus({ type: "submission", value: false });

		return {
			success: true,
			response,
			alreadyRevalidated: didRedirect || undefined,
		} as const;
	} catch (error) {
		if (isAbortError(error)) {
			// eat
			return {
				success: false,
				error: "Aborted",
			} as const;
		}

		LogError(error);
		setStatus({ type: "submission", value: false });

		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		} as const;
	}
}

/////////////////////////////////////////////////////////////////////
// STATUS
/////////////////////////////////////////////////////////////////////

const STATUS_EVENT_KEY = "hwy:status";

let isNavigating = false;
let isSubmitting = false;
let isRevalidating = false;

function setStatus({
	type,
	value,
}: {
	type: NavigationType | "submission";
	value: boolean;
}) {
	if (type === "dev-revalidation" || type === "prefetch") {
		return;
	}

	if (type === "revalidation") {
		isRevalidating = value;
	} else if (type === "submission") {
		isSubmitting = value;
	} else {
		isNavigating = value;
	}

	dispatchStatusEvent();
}

type StatusEventDetail = {
	isNavigating: boolean;
	isSubmitting: boolean;
	isRevalidating: boolean;
};

export type StatusEvent = CustomEvent<StatusEventDetail>;

let dispatchStatusEventDebounceTimer: number | undefined;

function dispatchStatusEvent() {
	clearTimeout(dispatchStatusEventDebounceTimer);

	dispatchStatusEventDebounceTimer = window.setTimeout(() => {
		window.dispatchEvent(
			new CustomEvent(STATUS_EVENT_KEY, {
				detail: {
					isRevalidating,
					isSubmitting,
					isNavigating,
				} satisfies StatusEventDetail,
			}),
		);
	}, 1);
}

export function getStatus(): StatusEventDetail {
	return {
		isNavigating,
		isSubmitting,
		isRevalidating,
	};
}

export const addStatusListener = makeListenerAdder<StatusEventDetail>(STATUS_EVENT_KEY);

/////////////////////////////////////////////////////////////////////
// ROUTE CHANGE LISTENER
/////////////////////////////////////////////////////////////////////

export const addRouteChangeListener = makeListenerAdder<RouteChangeEventDetail>(
	HWY_ROUTE_CHANGE_EVENT_KEY,
);

/////////////////////////////////////////////////////////////////////
// RE-RENDER APP
/////////////////////////////////////////////////////////////////////

export const internal_HwyClientGlobal = __getHwyClientGlobal();

const EXPORTED_ROUTE_COMP_VAR_NAME = "Route";

function resolvePublicHref(href: string): string {
	let baseURL = internal_HwyClientGlobal.get("viteDevURL");
	if (!baseURL) {
		baseURL = window.location.origin + "/public";
	}
	const url = baseURL + href;
	LogInfo("importing:", url);
	return url;
}

async function __reRenderApp({
	json,
	navigationType,
	runHistoryOptions,
}: {
	json: GetRouteDataOutput;
	navigationType: NavigationType;
	runHistoryOptions?: {
		href: string;
		scrollStateToRestore?: ScrollState;
		replace?: boolean;
	};
}) {
	if (json.clientRedirectURL) {
		return navigate(json.clientRedirectURL, { replace: true });
	}

	// Changing the title instantly makes it feel faster
	// The temp textarea trick is to decode any HTML entities in the title
	const tempTxt = document.createElement("textarea");
	tempTxt.innerHTML = json.title ?? "";
	document.title = tempTxt.value;

	// Add missing deps modulepreload links
	for (const x of json.deps ?? []) {
		const href = "/public/" + x;
		if (document.querySelector(`link[href="${href}"]`)) {
			continue;
		}
		const newLink = document.createElement("link");
		newLink.rel = "modulepreload";
		newLink.href = href;
		document.head.appendChild(newLink);
	}

	// Create an array to store promises for CSS bundle preloads
	const cssBundlePromises = [];

	// Add missing css bundle preload links
	for (const x of json.cssBundles ?? []) {
		const href = "/public/" + x;
		if (document.querySelector(`link[href="${href}"]`)) {
			continue;
		}
		const newLink = document.createElement("link");
		newLink.rel = "preload";
		newLink.href = href;
		newLink.as = "style";
		document.head.appendChild(newLink);

		// Create a promise for this CSS bundle preload
		const preloadPromise = new Promise((resolve, reject) => {
			newLink.onload = resolve;
			newLink.onerror = reject;
		});
		cssBundlePromises.push(preloadPromise);
	}

	const oldList = internal_HwyClientGlobal.get("importURLs");
	const newList = json.importURLs ?? [];

	const updatedList: {
		importPath: string;
		type: "new" | "same";
	}[] = [];

	// compare and populate updatedList
	for (let i = 0; i < Math.max(oldList.length, newList.length); i++) {
		if (i < oldList.length && i < newList.length && oldList[i] === newList[i]) {
			updatedList.push({
				importPath: oldList[i] ?? Panic(),
				type: "same",
			});
		} else if (i < newList.length) {
			updatedList.push({
				importPath: newList[i] ?? Panic(),
				type: "new",
			});
		}
	}

	// get new components only
	const components = updatedList.map((x) => {
		if (x.type === "new") {
			return import(/* @vite-ignore */ resolvePublicHref(x.importPath));
		}
	});
	const awaitedComps = await Promise.all(components);
	const awaitedDefaults = awaitedComps.map((x) => x?.[EXPORTED_ROUTE_COMP_VAR_NAME]);
	const awaitedErrorBoundaries = awaitedComps.map((x) => x?.ErrorBoundary);

	// placeholder list based on old list
	let newActiveComps = internal_HwyClientGlobal.get("activeComponents");
	let newActiveErrorBoundaries = internal_HwyClientGlobal.get("activeErrorBoundaries");

	// replace stale components with new ones where applicable
	for (let i = 0; i < awaitedDefaults.length; i++) {
		if (awaitedDefaults[i]) {
			newActiveComps[i] = awaitedDefaults[i];
		}
		if (awaitedErrorBoundaries[i]) {
			newActiveErrorBoundaries[i] = awaitedErrorBoundaries[i];
		}
	}

	// delete any remaining stale components
	if (oldList.length > newList.length) {
		newActiveComps = newActiveComps.slice(0, newList.length);
		newActiveErrorBoundaries = newActiveErrorBoundaries.slice(0, newList.length);
	}

	// NOW ACTUALLY SET EVERYTHING
	internal_HwyClientGlobal.set("activeComponents", newActiveComps);
	internal_HwyClientGlobal.set("activeErrorBoundaries", newActiveErrorBoundaries);

	const identicalKeysToSet = [
		"loadersData",
		"importURLs",
		"outermostErrorIndex",
		"splatValues",
		"params",
		"coreData",
	] as const satisfies ReadonlyArray<HwyClientGlobalKey>;

	for (const key of identicalKeysToSet) {
		internal_HwyClientGlobal.set(key, json[key]);
	}

	const oldID = internal_HwyClientGlobal.get("buildID");
	const newID = json.buildID;
	if (newID !== oldID) {
		dispatchBuildIDEvent({ newID, oldID });
		internal_HwyClientGlobal.set("buildID", json.buildID);
	}

	let highestIndex: number | undefined;
	for (let i = 0; i < updatedList.length; i++) {
		if (updatedList[i]?.type === "new") {
			highestIndex = i;
			break;
		}
	}

	let scrollStateToDispatch: ScrollState | undefined;

	if (runHistoryOptions) {
		// __TODO
		// - scroll to top on link clicks, but provide an opt-out
		// - scroll to top on form responses, but provide an opt-out

		const { href, scrollStateToRestore, replace } = runHistoryOptions;

		if (navigationType === "userNavigation" || navigationType === "redirect") {
			if (href !== location.href && navigationType !== "redirect" && !replace) {
				customHistory.push(href);
			} else {
				customHistory.replace(href);
			}
			scrollStateToDispatch = { x: 0, y: 0 };
		}

		if (navigationType === "browserHistory" && scrollStateToRestore) {
			scrollStateToDispatch = scrollStateToRestore;
		}

		// if revalidation, do nothing
	}

	// dispatch event
	const detail: RouteChangeEventDetail = {
		index: highestIndex ?? 0,
		scrollState: scrollStateToDispatch,
	} as const;

	// Wait for all CSS bundle preloads to complete
	if (cssBundlePromises.length > 0) {
		try {
			LogInfo("Waiting for CSS bundle preloads to complete...");
			await Promise.all(cssBundlePromises);
			LogInfo("CSS bundle preloads completed.");
		} catch (error) {
			LogError("Error preloading CSS bundles:", error);
		}
	}

	// Now that CSS is preloaded, update the DOM with any unseen CSS bundles
	window.requestAnimationFrame(() => {
		json.cssBundles?.forEach((x) => {
			if (document.querySelector(`link[${cssBundleDataAttr}="${x}"]`)) {
				return;
			}
			const newLink = document.createElement("link");
			newLink.rel = "stylesheet";
			newLink.href = "/public/" + x;
			newLink.setAttribute(cssBundleDataAttr, x);
			document.head.appendChild(newLink);
		});
	});

	window.dispatchEvent(new CustomEvent(HWY_ROUTE_CHANGE_EVENT_KEY, { detail }));

	head.removeAllBetween("meta");
	head.addBlocks("meta", json.metaHeadBlocks ?? []);
	head.removeAllBetween("rest");
	head.addBlocks("rest", json.restHeadBlocks ?? []);
}

const cssBundleDataAttr = "data-hwy-css-bundle";

/////////////////////////////////////////////////////////////////////
// SIMPLE WRAPPERS
/////////////////////////////////////////////////////////////////////

export async function navigate(href: string, options?: { replace?: boolean }) {
	await __navigate({
		href,
		navigationType: "userNavigation",
		replace: options?.replace,
	});
}

export async function revalidate() {
	await __navigate({
		href: window.location.href,
		navigationType: "revalidation",
	});
}

export async function devRevalidate() {
	await __navigate({
		href: window.location.href,
		navigationType: "dev-revalidation",
	});
}

/////////////////////////////////////////////////////////////////////
// GENERAL UTILS
/////////////////////////////////////////////////////////////////////

function isAbortError(error: unknown) {
	return error instanceof Error && error.name === "AbortError";
}

/////////////////////////////////////////////////////////////////////
// HEAD
/////////////////////////////////////////////////////////////////////

const head = {
	addBlocks,
	removeAllBetween,
} as const;

const markerCache: Record<string, { startComment: Comment | null; endComment: Comment | null }> =
	{};

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
				newEl.setAttribute(key, block.safeAttributes[key] ?? Panic());
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
	const iterator = document.createNodeIterator(document.head, NodeFilter.SHOW_COMMENT, {
		acceptNode(node: Comment) {
			return node.nodeValue?.trim() === matchingText
				? NodeFilter.FILTER_ACCEPT
				: NodeFilter.FILTER_REJECT;
		},
	});
	return iterator.nextNode() as Comment | null;
}

/////////////////////////////////////////////////////////////////////
// SCROLL RESTORATION
/////////////////////////////////////////////////////////////////////

const scrollStateMapKey = "__hwy__scrollStateMap";
type ScrollStateMap = Map<string, ScrollState>;

function getScrollStateMapFromLocalStorage() {
	const scrollStateMapString = localStorage.getItem(scrollStateMapKey);
	let scrollStateMap: ScrollStateMap;
	if (scrollStateMapString) {
		scrollStateMap = new Map(JSON.parse(scrollStateMapString));
	} else {
		scrollStateMap = new Map();
	}
	return scrollStateMap;
}

function setScrollStateMapToLocalStorage(newScrollStateMap: ScrollStateMap) {
	localStorage.setItem(scrollStateMapKey, JSON.stringify(Array.from(newScrollStateMap.entries())));
}

function setScrollStateMapSubKey(key: string, value: ScrollState) {
	const scrollStateMap = getScrollStateMapFromLocalStorage();
	scrollStateMap.set(key, value);

	// if new item would brought it over 50 entries, delete the oldest one
	if (scrollStateMap.size > 50) {
		const oldestKey = Array.from(scrollStateMap.keys())[0];
		scrollStateMap.delete(oldestKey ?? Panic());
	}

	setScrollStateMapToLocalStorage(scrollStateMap);
}

function readScrollStateMapSubKey(key: string) {
	const scrollStateMap = getScrollStateMapFromLocalStorage();
	return scrollStateMap.get(key);
}

const scrollStateMapSubKey = {
	read: readScrollStateMapSubKey,
	set: setScrollStateMapSubKey,
};

/////////////////////////////////////////////////////////////////////
// CUSTOM HISTORY
/////////////////////////////////////////////////////////////////////

let customHistory: ReturnType<typeof createBrowserHistory>;
let lastKnownCustomLocation: (typeof customHistory)["location"];

function initCustomHistory() {
	customHistory = createBrowserHistory();
	lastKnownCustomLocation = customHistory.location;
	customHistory.listen(customHistoryListener);
	setNativeScrollRestorationToManual();
}

function setNativeScrollRestorationToManual() {
	if (history.scrollRestoration && history.scrollRestoration !== "manual") {
		history.scrollRestoration = "manual";
	}
}

async function customHistoryListener({ action, location }: Update) {
	// save current scroll state to map
	scrollStateMapSubKey.set(lastKnownCustomLocation.key, {
		x: window.scrollX,
		y: window.scrollY,
	});

	if (action === "POP") {
		if (
			location.key !== lastKnownCustomLocation.key &&
			(location.pathname !== lastKnownCustomLocation.pathname ||
				location.search !== lastKnownCustomLocation.search)
		) {
			await __navigate({
				href: window.location.href,
				navigationType: "browserHistory",
				scrollStateToRestore: scrollStateMapSubKey.read(location.key),
			});
		}
	}

	// now set lastKnownCustomLocation to new location
	lastKnownCustomLocation = location;
}

export function getHistoryInstance() {
	return customHistory;
}

/////////////////////////////////////////////////////////////////////
// INIT CLIENT
/////////////////////////////////////////////////////////////////////

export async function initClient(renderFn: () => void) {
	console.log("RUNNING INIT CLIENT");

	// HANDLE HISTORY STUFF
	initCustomHistory();

	// HANDLE COMPONENTS
	const components = await importComponents();
	internal_HwyClientGlobal.set(
		"activeComponents",
		components.map((x) => x?.[EXPORTED_ROUTE_COMP_VAR_NAME]),
	);
	internal_HwyClientGlobal.set(
		"activeErrorBoundaries",
		components.map((x) => x.ErrorBoundary),
	);

	// RUN THE RENDER FUNCTION
	renderFn();

	// INSTANTIATE GLOBAL EVENT LISTENERS
	__addAnchorClickListener();
}

function importComponents() {
	return Promise.all(
		internal_HwyClientGlobal.get("importURLs").map((x) => {
			return import(/* @vite-ignore */ resolvePublicHref(x));
		}),
	);
}

export function getCurrentHwyData<T = any>() {
	return {
		buildID: internal_HwyClientGlobal.get("buildID") || "",
		splatValues: internal_HwyClientGlobal.get("splatValues") || [],
		params: internal_HwyClientGlobal.get("params") || {},
		coreData: (internal_HwyClientGlobal.get("coreData") || null) as T | null,
	};
}

/////////////////////////////////////////////////////////////////////
// BUILD ID
/////////////////////////////////////////////////////////////////////

const BUILD_ID_EVENT_KEY = "hwy:build-id";

type BuildIDEvent = { oldID: string; newID: string };

function dispatchBuildIDEvent(detail: BuildIDEvent) {
	window.dispatchEvent(new CustomEvent(BUILD_ID_EVENT_KEY, { detail }));
}

export const addBuildIDListener = makeListenerAdder<BuildIDEvent>(BUILD_ID_EVENT_KEY);

export function getBuildID() {
	return internal_HwyClientGlobal.get("buildID");
}

/////////////////////////////////////////////////////////////////////
// LISTENER UTILS
/////////////////////////////////////////////////////////////////////

type CleanupFunction = () => void;

function makeListenerAdder<T>(key: string) {
	return function addListener(listener: (event: CustomEvent<T>) => void): CleanupFunction {
		window.addEventListener(key, listener as any);
		return () => {
			window.removeEventListener(key, listener as any);
		};
	};
}

/////////////////////////////////////////////////////////////////////
// DATA BOOST LISTENERS
/////////////////////////////////////////////////////////////////////

type LinkClickListenerCallback<E extends Event> = (event: E) => void | Promise<void>;

type LinkClickListenerCallbacksBase<E extends Event> = {
	beforeBegin?: LinkClickListenerCallback<E>;
	beforeRender?: LinkClickListenerCallback<E>;
	afterRender?: LinkClickListenerCallback<E>;
};

type LinkClickListenerCallbacks<E extends Event> = LinkClickListenerCallbacksBase<E> & {
	requireDataBoostAttribute: boolean;
};

export function makeLinkClickListenerFn<E extends Event>(callbacks: LinkClickListenerCallbacks<E>) {
	return async (event: E) => {
		if (event.defaultPrevented) {
			return;
		}

		const anchorDetails = getAnchorDetailsFromEvent(event as unknown as MouseEvent);
		if (!anchorDetails) {
			return;
		}

		const { anchor, isEligibleForDefaultPrevention, isInternal } = anchorDetails;

		if (!anchor || (callbacks.requireDataBoostAttribute && !anchor.dataset.boost)) {
			return;
		}

		if (isEligibleForDefaultPrevention && isInternal) {
			event.preventDefault();

			await callbacks.beforeBegin?.(event);

			const x = beginNavigation({
				href: anchor.href,
				navigationType: "userNavigation",
			});
			if (!x.promise) {
				return;
			}

			const res = await x.promise;
			if (!res) {
				return;
			}

			await callbacks.beforeRender?.(event);

			await __completeNavigation(res);

			await callbacks.afterRender?.(event);
		}
	};
}

const baseDataBoostListenerFn = makeLinkClickListenerFn({ requireDataBoostAttribute: true });

function __addAnchorClickListener() {
	document.body.addEventListener("click", baseDataBoostListenerFn);
}

/////////////////////////////////////////////////////////////////////
// DUMB LITTLE HELPERS
/////////////////////////////////////////////////////////////////////

function LogInfo(message?: any, ...optionalParams: any[]) {
	console.log("HWY:", message, ...optionalParams);
}

function LogError(message?: any, ...optionalParams: any[]) {
	console.error("HWY:", message, ...optionalParams);
}

function Panic(msg?: string): never {
	LogError("Panic");
	throw new Error(msg ?? "panic");
}

(globalThis as any).__debug = getRawCtx();

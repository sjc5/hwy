/////////////////////////////////////////////////////////////////////
/////// ROUTE COMPONENTS
/////////////////////////////////////////////////////////////////////

import { getPrefetchHandlers, makeLinkClickListenerFn } from "./client.ts";

export type RoutePropsTypeArg = {
	loaderData?: any;
	coreData?: any;
};

export type DefaultRoutePropsTypeArg = {
	loaderData: any;
	coreData: any;
};

export type Shared<JSXElement, T extends RoutePropsTypeArg = DefaultRoutePropsTypeArg> = {
	RouteProps: RouteProps<JSXElement>;
	Route: Route<JSXElement, T>;
};

type RouteProps<JSXElement> = {
	idx: number;
	Outlet: (...props: any) => JSXElement;
} & Record<string, any>;

type Route<JSXElement, T extends RoutePropsTypeArg> = (props: RouteProps<JSXElement>) => JSXElement;

export type RootOutletProps<JSXElement> = {
	idx?: number;
	defaultServerErrorComponent?: () => JSXElement;
};

/////////////////////////////////////////////////////////////////////
/////// LINK COMPONENTS
/////////////////////////////////////////////////////////////////////

// __TODO add prefetch = "render" and prefetch = "viewport" options, a la Remix
// __TODO don't link prefetch where you already are -- eg make an exception for window.location.pathname

export type LinkPropsBase<LinkClickCallback> = {
	href?: string;
	prefetch?: "intent";
	prefetchTimeout?: number;
	beforeBegin?: LinkClickCallback;
	beforeRender?: LinkClickCallback;
	afterRender?: LinkClickCallback;
} & Record<string, any>;

function linkPropsToPrefetchObj<LinkClickCallback>(props: LinkPropsBase<LinkClickCallback>) {
	if (!props.href || props.prefetch !== "intent") {
		return undefined;
	}

	return getPrefetchHandlers({
		href: props.href,
		timeout: props.prefetchTimeout,
		beforeBegin: props.beforeBegin as any,
		beforeRender: props.beforeRender as any,
		afterRender: props.afterRender as any,
	});
}

function linkPropsToClickListenerFn<LinkClickCallback>(props: LinkPropsBase<LinkClickCallback>) {
	return makeLinkClickListenerFn({
		beforeBegin: props.beforeBegin as any,
		beforeRender: props.beforeRender as any,
		afterRender: props.afterRender as any,
		requireDataBoostAttribute: false,
	});
}

type handlerKeys = {
	onPointerEnter: string;
	onFocus: string;
	onPointerLeave: string;
	onBlur: string;
	onClick: string;
};

const standardCamelHandlerKeys = {
	onPointerEnter: "onPointerEnter",
	onFocus: "onFocus",
	onPointerLeave: "onPointerLeave",
	onBlur: "onBlur",
	onClick: "onClick",
} satisfies handlerKeys;

export function makeFinalLinkProps<LinkClickCallback>(
	props: LinkPropsBase<LinkClickCallback>,
	keys: {
		onPointerEnter: string;
		onFocus: string;
		onPointerLeave: string;
		onBlur: string;
		onClick: string;
	} = standardCamelHandlerKeys,
) {
	const prefetchObj = linkPropsToPrefetchObj(props);

	return {
		dataExternal: prefetchObj?.isExternal || undefined,
		onPointerEnter: (e: any) => {
			prefetchObj?.start(e);
			if (isFn(props[keys.onPointerEnter])) props[keys.onPointerEnter](e);
		},
		onFocus: (e: any) => {
			prefetchObj?.start(e);
			if (isFn(props[keys.onFocus])) props[keys.onFocus](e);
		},
		onPointerLeave: (e: any) => {
			prefetchObj?.stop();
			if (isFn(props[keys.onPointerLeave])) props[keys.onPointerLeave](e);
		},
		onBlur: (e: any) => {
			prefetchObj?.stop();
			if (isFn(props[keys.onBlur])) props[keys.onBlur](e);
		},
		onClick: async (e: any) => {
			if (isFn(props[keys.onClick])) props[keys.onClick](e);
			if (prefetchObj) {
				await prefetchObj.onClick(e);
			} else {
				await linkPropsToClickListenerFn(props)(e);
			}
		},
	};
}

function isFn(fn: any): fn is (...args: any[]) => any {
	return typeof fn === "function";
}

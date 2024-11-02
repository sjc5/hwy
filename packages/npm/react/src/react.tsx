import {
	type RouteChangeEvent,
	addRouteChangeListener,
	internal_HwyClientGlobal as ctx,
	getPrefetchHandlers,
	makeLinkClickListenerFn,
} from "@hwy-js/client";
import { jsonDeepEquals } from "@sjc5/kit/json";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

/////////////////////////////////////////////////////////////////////
// RECURSIVE ROUTE COMPONENT
/////////////////////////////////////////////////////////////////////

type ErrorBoundaryComp = () => JSX.Element;

type BaseProps<AHD = any> = {
	routeData?: unknown; // RouteData<AHD>;
	index?: number;
	fallbackErrorBoundary?: ErrorBoundaryComp;
	adHocData?: AHD;
	layout?: HwyLayout<{ adHocData: AHD }>;
};

let shouldScroll = false;

export function HwyRootOutlet<AHD>(props: BaseProps<AHD>): JSX.Element {
	const idx = props.index ?? 0;

	const CurrentComponent = ctx.get("activeComponents")?.[idx];

	const [thisComponentsImportURL, setThisComponentsImportURL] = useState(
		ctx.get("importURLs")?.[idx],
	);
	const [adHocData, setAdHocData] = useState(ctx.get("adHocData") ?? props.adHocData);
	const [params, setParams] = useState(ctx.get("params") ?? {});
	const [splatSegments, setSplatSegments] = useState(ctx.get("splatSegments") ?? []);
	const [loaderData, setLoaderData] = useState(ctx.get("loadersData")?.[idx]);

	useEffect(() => {
		const listener = (e: RouteChangeEvent) => {
			const newThisComponentsImportURL = ctx.get("importURLs")?.[idx];
			const newAdHocData = ctx.get("adHocData") ?? props.adHocData;
			const newParams = ctx.get("params") ?? {};
			const newSplatSegments = ctx.get("splatSegments") ?? [];
			const newLoaderData = ctx.get("loadersData")?.[idx];

			flushSync(() => {
				if (!jsonDeepEquals(thisComponentsImportURL, newThisComponentsImportURL)) {
					setThisComponentsImportURL(newThisComponentsImportURL);
				}
				if (!jsonDeepEquals(adHocData, newAdHocData)) {
					setAdHocData(newAdHocData);
				}
				if (!jsonDeepEquals(params, newParams)) {
					setParams(newParams);
				}
				if (!jsonDeepEquals(splatSegments, newSplatSegments)) {
					setSplatSegments(newSplatSegments);
				}
				if (!jsonDeepEquals(loaderData, newLoaderData)) {
					setLoaderData(newLoaderData);
				}
			});

			if (e.detail.scrollState) {
				shouldScroll = true;
				window.requestAnimationFrame(() => {
					if (shouldScroll && e.detail.scrollState) {
						window.scrollTo(e.detail.scrollState.x, e.detail.scrollState.y);
						shouldScroll = false;
					}
				});
			}
		};

		return addRouteChangeListener(listener);
	}, [thisComponentsImportURL, adHocData, params, splatSegments, loaderData]);

	const EB = useMemo(
		() =>
			ctx.get("activeErrorBoundaries")?.[idx] ??
			props.fallbackErrorBoundary ?? <div>Error: No error boundary found.</div>,
		[idx],
	);

	const Outlet = useMemo(() => {
		let outlet;

		const nextOutletIsAnErrorBoundary = ctx.get("outermostErrorIndex") === idx + 1;

		if (!nextOutletIsAnErrorBoundary) {
			outlet = (localProps: Record<string, any> | undefined) => {
				return <HwyRootOutlet {...localProps} {...props} index={idx + 1} />;
			};
		} else {
			outlet = ctx.get("activeErrorBoundaries")?.[idx + 1] ?? props.fallbackErrorBoundary;
			if (!outlet) {
				outlet = () => <div>Error: No error boundary found.</div>;
			}
		}
		return outlet;
	}, [ctx.get("importURLs")?.[idx + 1]]);

	const extendedProps = useMemo(() => {
		return {
			...props,
			params,
			splatSegments,
			loaderData,
			Outlet,
			adHocData,
		};
	}, [props, params, splatSegments, loaderData, Outlet, adHocData]);

	const ebc = useMemo(() => {
		return (
			(ctx.get("activeErrorBoundaries") as any)
				?.splice(0, idx + 1)
				?.reverse()
				?.find((x: any) => x) ??
			props.fallbackErrorBoundary ?? <div>Error: No error boundary found.</div>
		);
	}, [idx]);

	if (!CurrentComponent) {
		return (
			<MaybeWithLayout {...extendedProps}>
				{/* biome-ignore lint: */}
				<></>
			</MaybeWithLayout>
		);
	}

	try {
		if (ctx.get("outermostErrorIndex") === idx) {
			if (props.layout && idx === 0) {
				return (
					<props.layout
						adHocData={props.adHocData}
						params={params as any}
						splatSegments={splatSegments as any}
					>
						<EB />
					</props.layout>
				);
			}

			return <EB />;
		}

		return (
			<MaybeWithLayout {...extendedProps}>
				<CurrentComponent {...extendedProps} />
			</MaybeWithLayout>
		);
	} catch (error) {
		console.error(error);

		return <MaybeWithLayout {...extendedProps} children={ebc} />;
	}
}

function MaybeWithLayout(
	props: BaseProps & HwyLayoutProps & { children: JSX.Element },
): JSX.Element {
	if (props.layout && !props.index) {
		return (
			<props.layout
				adHocData={props.adHocData}
				params={props.params as any}
				splatSegments={props.splatSegments as any}
			>
				{props.children}
			</props.layout>
		);
	}
	return props.children;
}

type RoutePropsTypeArg = {
	loaderData?: any;
	adHocData?: any;
};

type DefaultRouteProps = {
	loaderData: any;
	adHocData: any;
};

export type HwyRouteProps<T extends RoutePropsTypeArg = DefaultRouteProps> = {
	loaderData: T["loaderData"];
	Outlet: (...props: any) => JSX.Element;
	params: Record<string, string>;
	splatSegments: Array<string>;
	adHocData: T["adHocData"] | undefined;
};

export type HwyRoute<T extends RoutePropsTypeArg = DefaultRouteProps> = (
	props: HwyRouteProps<T>,
) => JSX.Element;

export type HwyLayoutProps<T extends RoutePropsTypeArg = DefaultRouteProps> = {
	children: JSX.Element;
} & Pick<HwyRouteProps<T>, "params" | "splatSegments" | "adHocData">;

export type HwyLayout<T extends RoutePropsTypeArg = DefaultRouteProps> = (
	props: HwyLayoutProps<T>,
) => JSX.Element;

/////////////////////////////////////////////////////////////////////
// LINK COMPONENT
/////////////////////////////////////////////////////////////////////

// __TODO add prefetch = "render" and prefetch = "viewport" options, a la Remix

type HwyLinkClickCallback = (
	e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
) => void | Promise<void>;

type HwyLinkProps = {
	prefetch?: "intent";
	prefetchTimeout?: number;
	beforeBegin?: HwyLinkClickCallback;
	beforeRender?: HwyLinkClickCallback;
	afterRender?: HwyLinkClickCallback;
};
type LinkProps = ComponentProps<"a"> & HwyLinkProps;

export function Link(props: LinkProps) {
	const prefetchObj = useMemo(() => {
		return props.href
			? getPrefetchHandlers({
					href: props.href,
					timeout: props.prefetchTimeout,
					beforeBegin: props.beforeBegin as any,
					beforeRender: props.beforeRender as any,
					afterRender: props.afterRender as any,
				})
			: undefined;
	}, [props]);

	const conditionalPrefetchObj = props.prefetch === "intent" ? prefetchObj : undefined;

	const sansPrefetchSPAOnClick = useMemo(() => {
		return makeLinkClickListenerFn({
			beforeBegin: props.beforeBegin as any,
			beforeRender: props.beforeRender as any,
			afterRender: props.afterRender as any,
			requireDataBoostAttribute: false,
		});
	}, [props]);

	return (
		<a
			data-external={prefetchObj?.isExternal || undefined}
			{...props}
			onPointerEnter={(e) => {
				conditionalPrefetchObj?.start(e as any);
				props.onPointerEnter?.(e);
			}}
			onFocus={(e) => {
				conditionalPrefetchObj?.start(e as any);
				props.onFocus?.(e);
			}}
			onPointerLeave={(e) => {
				conditionalPrefetchObj?.stop();
				props.onPointerLeave?.(e);
			}}
			onBlur={(e) => {
				conditionalPrefetchObj?.stop();
				props.onBlur?.(e);
			}}
			// biome-ignore lint:
			onClick={async (e) => {
				props.onClick?.(e);
				if (conditionalPrefetchObj) {
					await conditionalPrefetchObj.onClick(e as any);
				} else {
					await sansPrefetchSPAOnClick(e as any);
				}
			}}
		>
			{props.children}
		</a>
	);
}

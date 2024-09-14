import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import type { RouteChangeEvent, RouteData } from "../../common/index.mjs";
import {
	HWY_ROUTE_CHANGE_EVENT_KEY,
	getHwyClientGlobal,
} from "../../common/index.mjs";

type ErrorBoundaryComp = () => JSX.Element;

type BaseProps<AHD = any> = {
	routeData?: RouteData<AHD>;
	index?: number;
	fallbackErrorBoundary?: ErrorBoundaryComp;
	adHocData?: AHD;
	layout?: HwyLayout<{ adHocData: AHD }>;
};

let shouldScroll = false;

export function HwyRootOutlet<AHD>(props: BaseProps<AHD>): JSX.Element {
	const ctx = getHwyClientGlobal();
	const idx = props.index ?? 0;

	const CurrentComponent = (ctx.get("activeComponents") as any)?.[idx];

	const [adHocData, setAdHocData] = useState(
		ctx.get("adHocData") ?? props.adHocData,
	);
	const [params, setParams] = useState(ctx.get("params") ?? {});
	const [splatSegments, setSplatSegments] = useState(
		ctx.get("splatSegments") ?? [],
	);
	const [loaderData, setLoaderData] = useState(
		(ctx.get("loadersData") as any)?.[idx],
	);

	const listener = useCallback((e: RouteChangeEvent) => {
		flushSync(() => {
			setAdHocData(ctx.get("adHocData") ?? props.adHocData);
			setParams(ctx.get("params") ?? {});
			setSplatSegments(ctx.get("splatSegments") ?? []);
			setLoaderData((ctx.get("loadersData") as any)?.[idx]);
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
	}, []);

	useEffect(() => {
		window.addEventListener(
			HWY_ROUTE_CHANGE_EVENT_KEY,
			listener as EventListener,
		);
		return () => {
			window.removeEventListener(
				HWY_ROUTE_CHANGE_EVENT_KEY,
				listener as EventListener,
			);
		};
	}, []);

	const EB = useMemo(
		() =>
			(ctx.get("activeErrorBoundaries") as any)?.[idx] ??
			props.fallbackErrorBoundary ?? <div>Error: No error boundary found.</div>,
		[idx],
	);

	const Outlet = useMemo(() => {
		let outlet;

		const nextOutletIsAnErrorBoundary =
			ctx.get("outermostErrorIndex") === idx + 1;

		if (!nextOutletIsAnErrorBoundary) {
			outlet = (localProps: Record<string, any> | undefined) => {
				return <HwyRootOutlet {...localProps} {...props} index={idx + 1} />;
			};
		} else {
			outlet =
				(ctx.get("activeErrorBoundaries") as any)?.[idx + 1] ??
				props.fallbackErrorBoundary;
			if (!outlet) {
				outlet = () => <div>Error: No error boundary found.</div>;
			}
		}
		return outlet;
	}, [(ctx.get("importURLs") as any)?.[idx + 1]]);

	const extendedProps = useMemo(() => {
		return {
			...props,
			params: params as any,
			splatSegments: splatSegments as any,
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
		return <></>;
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

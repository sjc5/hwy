import { addRouteChangeListener, internal_HwyClientGlobal as ctx } from "@hwy-js/client";
import { jsonDeepEquals } from "@sjc5/kit/json";
import { type JSX, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import type { RootOutletProps } from "../../client/src/impl_helpers.ts";

let shouldScroll = false;

export function HwyRootOutlet<RD>(props: RootOutletProps<JSX.Element, RD>): JSX.Element {
	const s = useRootState(props);

	const CurrentComp = useMemo(() => {
		return ctx.get("activeComponents")?.[s.idx];
	}, [s.currentImportURL]);

	const ErrorBoundary = useMemo(() => {
		const CurrentErrorBoundary = ctx.get("activeErrorBoundaries")?.[s.idx];
		const FallbackErrorBoundary = props.defaultServerErrorComponent;

		return CurrentErrorBoundary ?? FallbackErrorBoundary ?? NoErrorBoundaryFound;
	}, [s.idx]);

	const Outlet = useMemo(() => {
		let outlet;

		const nextOutletIsAnErrorBoundary = ctx.get("outermostErrorIndex") === s.idx + 1;

		if (!nextOutletIsAnErrorBoundary) {
			outlet = (localProps: Record<string, any> | undefined) => {
				return <HwyRootOutlet {...localProps} {...props} index={s.idx + 1} />;
			};
		} else {
			outlet = ctx.get("activeErrorBoundaries")?.[s.idx + 1] ?? props.defaultServerErrorComponent;
			if (!outlet) {
				outlet = () => <div>Error: No error boundary found.</div>;
			}
		}
		return outlet;
	}, [s.nextImportURL]);

	const extendedProps = useMemo(() => {
		return {
			...props,
			Outlet,
			params: s.params,
			splatValues: s.splatValues,
			loaderData: s.loaderData,
			coreData: s.coreData,
		};
	}, [props, Outlet, s.params, s.splatValues, s.loaderData, s.coreData]);

	const ebc = useMemo(() => {
		return (
			ctx
				.get("activeErrorBoundaries")
				?.splice(0, s.idx + 1)
				?.reverse()
				?.find((x: any) => x) ??
			props.defaultServerErrorComponent ?? <div>Error: No error boundary found.</div>
		);
	}, [s.idx]);

	if (!CurrentComp) {
		return <></>;
	}

	try {
		if (ctx.get("outermostErrorIndex") === s.idx) {
			return <ErrorBoundary />;
		}

		return <CurrentComp {...extendedProps} />;
	} catch (error) {
		console.error("HWY:", error);
		return ebc;
	}
}

function useRootState<RD>(props: RootOutletProps<RD>) {
	const idx = props.index ?? 0;

	const [currentImportURL, setCurrentImportURL] = useState(ctx.get("importURLs")?.[idx]);
	const [nextImportURL, setNextImportURL] = useState(ctx.get("importURLs")?.[idx + 1]);

	const [coreData, setCoreData] = useState(ctx.get("coreData") ?? props.coreData);
	const [params, setParams] = useState(ctx.get("params") ?? {});
	const [splatValues, setSplatValues] = useState(ctx.get("splatValues") ?? []);
	const [loaderData, setLoaderData] = useState(ctx.get("loadersData")?.[idx]);

	useEffect(() => {
		return addRouteChangeListener((e) => {
			const newCurrentImportURL = ctx.get("importURLs")?.[idx];
			const newNextImportURL = ctx.get("importURLs")?.[idx + 1];

			const newCoreData = ctx.get("coreData") ?? props.coreData;
			const newParams = ctx.get("params") ?? {};
			const newSplatValues = ctx.get("splatValues") ?? [];
			const newLoaderData = ctx.get("loadersData")?.[idx];

			flushSync(() => {
				if (currentImportURL !== newCurrentImportURL) setCurrentImportURL(newCurrentImportURL);
				if (nextImportURL !== newNextImportURL) setNextImportURL(newNextImportURL);

				if (!jsonDeepEquals(coreData, newCoreData)) setCoreData(newCoreData);
				if (!jsonDeepEquals(params, newParams)) setParams(newParams);
				if (!jsonDeepEquals(splatValues, newSplatValues)) setSplatValues(newSplatValues);
				if (!jsonDeepEquals(loaderData, newLoaderData)) setLoaderData(newLoaderData);
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
		});
	}, [currentImportURL, coreData, params, splatValues, loaderData]);

	return {
		idx,
		currentImportURL,
		setCurrentImportURL,
		nextImportURL,
		setNextImportURL,
		coreData,
		setCoreData,
		params,
		setParams,
		splatValues,
		setSplatValues,
		loaderData,
		setLoaderData,
	};
}

function NoErrorBoundaryFound() {
	return <div>Error: No error boundary found.</div>;
}

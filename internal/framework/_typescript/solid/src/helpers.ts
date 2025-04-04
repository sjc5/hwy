import { createSignal } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import { addRouteChangeListener, getCurrentRiverData } from "../../client/index.ts";
import type { Route, RouteProps, UntypedLoader } from "../../client/src/impl_helpers.ts";
import { loadersData } from "./solid.tsx";

export type RiverRouteProps<
	T extends UntypedLoader = UntypedLoader,
	Pattern extends T["pattern"] = string,
> = RouteProps<JSX.Element, T, Pattern>;

export type RiverRoute<
	T extends UntypedLoader = UntypedLoader,
	Pattern extends T["pattern"] = string,
> = Route<JSX.Element, T, Pattern>;

export function makeTypedUseCurrentRiverData<RD>() {
	const [currentRiverData, setCurrentRiverData] = createSignal(getCurrentRiverData<RD>());
	addRouteChangeListener(() => setCurrentRiverData(getCurrentRiverData<RD>()));
	return currentRiverData;
}

export function makeTypedUseLoaderData<T extends UntypedLoader>() {
	return function useLoaderData<P extends RiverRouteProps<T>>(
		props: P,
	): Extract<T, { pattern: P["__phantom_pattern"] }>["phantomOutputType"] | undefined {
		return loadersData()?.[props.idx];
	};
}

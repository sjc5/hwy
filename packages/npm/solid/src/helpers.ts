import { addRouteChangeListener, getCurrentHwyData } from "@hwy-js/client";
import { createSignal } from "solid-js";
import { loadersData } from "./solid.tsx";

export function makeTypedUseCurrentHwyData<RD>() {
	const [currentHwyData, setCurrentHwyData] = createSignal(getCurrentHwyData<RD>());

	addRouteChangeListener(() => {
		setCurrentHwyData(getCurrentHwyData<RD>());
	});

	return currentHwyData;
}

export function makeTypedUseLoaderData<
	T extends {
		pattern: string;
		phantomOutputType: any;
		routeType: string;
	},
>() {
	return function useLoaderData<Pattern extends T["pattern"]>(props: { depth: number }):
		| Extract<T, { pattern: Pattern }>["phantomOutputType"]
		| undefined {
		return loadersData()?.[props.depth];
	};
}

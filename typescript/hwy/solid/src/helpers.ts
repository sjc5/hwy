import { createSignal } from "solid-js";
import { addRouteChangeListener, getCurrentHwyData } from "../../client/index.ts";
import { loadersData } from "./solid.tsx";

export function makeTypedUseCurrentHwyData<RD>() {
	const [currentHwyData, setCurrentHwyData] = createSignal(getCurrentHwyData<RD>());
	addRouteChangeListener(() => setCurrentHwyData(getCurrentHwyData<RD>()));
	return currentHwyData;
}

export function makeTypedUseLoaderData<
	T extends { _type: string; pattern: string; phantomOutputType: any },
>() {
	return function useLoaderData<Pattern extends T["pattern"]>(props: {
		depth: number;
	}): Extract<T, { pattern: Pattern }>["phantomOutputType"] | undefined {
		return loadersData()?.[props.depth];
	};
}

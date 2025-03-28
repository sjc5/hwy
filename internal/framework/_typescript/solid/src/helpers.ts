import { createSignal } from "solid-js";
import { addRouteChangeListener, getCurrentRiverData } from "../../client/index.ts";
import { loadersData } from "./solid.tsx";

export function makeTypedUseCurrentRiverData<RD>() {
	const [currentRiverData, setCurrentRiverData] = createSignal(getCurrentRiverData<RD>());
	addRouteChangeListener(() => setCurrentRiverData(getCurrentRiverData<RD>()));
	return currentRiverData;
}

export function makeTypedUseLoaderData<
	T extends { _type: string; pattern: string; phantomOutputType: any },
>() {
	return function useLoaderData<Pattern extends T["pattern"]>(props: {
		idx: number;
	}): Extract<T, { pattern: Pattern }>["phantomOutputType"] | undefined {
		return loadersData()?.[props.idx];
	};
}

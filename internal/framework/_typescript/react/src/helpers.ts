import { useAtomValue } from "jotai";
import type { getCurrentRiverData } from "../../client/index.ts";
import { currentRiverDataAtom, loadersDataAtom } from "./react.tsx";

export function makeTypedUseCurrentRiverData<RD>() {
	return () => useAtomValue(currentRiverDataAtom) as ReturnType<typeof getCurrentRiverData<RD>>;
}

export function makeTypedUseLoaderData<
	T extends { _type: string; pattern: string; phantomOutputType: any },
>() {
	return function useLoaderData<Pattern extends T["pattern"]>(props: {
		depth: number;
	}): Extract<T, { pattern: Pattern }>["phantomOutputType"] | undefined {
		const loadersData = useAtomValue(loadersDataAtom);
		return loadersData?.[props.depth];
	};
}

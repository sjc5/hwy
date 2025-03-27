import { useAtomValue } from "jotai";
import type { getCurrentHwyData } from "../../client/index.ts";
import { currentHwyDataAtom, loadersDataAtom } from "./react.tsx";

export function makeTypedUseCurrentHwyData<RD>() {
	return () => useAtomValue(currentHwyDataAtom) as ReturnType<typeof getCurrentHwyData<RD>>;
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

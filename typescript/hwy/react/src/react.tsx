import { atom, useAtom } from "jotai";
import { type JSX, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { jsonDeepEquals } from "../../../kit/json/json.ts";
import {
	addRouteChangeListener,
	internal_HwyClientGlobal as ctx,
	getCurrentHwyData,
} from "../../client/index.ts";
import type { RootOutletProps } from "../../client/src/impl_helpers.ts";

let shouldScroll = false;

const importURLsAtom = atom(ctx.get("importURLs"));
const coreDataAtom = atom(ctx.get("coreData"));
const paramsAtom = atom(ctx.get("params") ?? {});
const splatValuesAtom = atom(ctx.get("splatValues") ?? []);
export const loadersDataAtom = atom(ctx.get("loadersData"));
export const currentHwyDataAtom = atom(getCurrentHwyData());

export function HwyRootOutlet<RD>(props: RootOutletProps<JSX.Element, RD>): JSX.Element {
	const idx = props.index ?? 0;
	const [currentImportURL, setCurrentImportURL] = useState(ctx.get("importURLs")?.[idx]);
	const [nextImportURL, setNextImportURL] = useState(ctx.get("importURLs")?.[idx + 1]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: nope
	useEffect(() => {
		return addRouteChangeListener(() => {
			const newCurrentImportURL = ctx.get("importURLs")?.[idx];
			const newNextImportURL = ctx.get("importURLs")?.[idx + 1];

			if (currentImportURL !== newCurrentImportURL) setCurrentImportURL(newCurrentImportURL);
			if (nextImportURL !== newNextImportURL) setNextImportURL(newNextImportURL);
		});
	}, [currentImportURL]);

	const [importURLs, setImportURLs] = useAtom(importURLsAtom);
	const [coreData, setCoreData] = useAtom(coreDataAtom);
	const [params, setParams] = useAtom(paramsAtom);
	const [splatValues, setSplatValues] = useAtom(splatValuesAtom);
	const [loadersData, setLoadersData] = useAtom(loadersDataAtom);
	const [currentHwyData, setCurrentHwyData] = useAtom(currentHwyDataAtom);

	// biome-ignore lint/correctness/useExhaustiveDependencies: nope
	useEffect(() => {
		if (idx === 0) {
			return addRouteChangeListener((e) => {
				const newImportURLs = ctx.get("importURLs");
				const newCoreData = ctx.get("coreData");
				const newParams = ctx.get("params") ?? {};
				const newSplatValues = ctx.get("splatValues") ?? [];
				const newLoadersData = ctx.get("loadersData");
				const newCurrentHwyData = getCurrentHwyData();

				flushSync(() => {
					if (!jsonDeepEquals(importURLs, newImportURLs)) setImportURLs(newImportURLs);
					if (!jsonDeepEquals(coreData, newCoreData)) setCoreData(newCoreData);
					if (!jsonDeepEquals(params, newParams)) setParams(newParams);
					if (!jsonDeepEquals(splatValues, newSplatValues)) setSplatValues(newSplatValues);
					if (!jsonDeepEquals(loadersData, newLoadersData)) setLoadersData(newLoadersData);
					if (!jsonDeepEquals(currentHwyData, newCurrentHwyData))
						setCurrentHwyData(newCurrentHwyData);
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
		}
	}, [idx]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: nope
	const CurrentComp = useMemo(() => ctx.get("activeComponents")?.[idx], [currentImportURL]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: nope
	const Outlet = useMemo(
		() => (localProps: Record<string, any> | undefined) => {
			return <HwyRootOutlet {...localProps} {...props} index={idx + 1} />;
		},
		[nextImportURL],
	);

	if (!CurrentComp) return <></>;

	return <CurrentComp depth={idx} Outlet={Outlet} />;
}

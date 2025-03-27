import { createEffect, createMemo, createSignal, ErrorBoundary, type JSX, Show } from "solid-js";
import {
	addRouteChangeListener,
	internal_HwyClientGlobal as ctx,
	type RouteChangeEvent,
} from "../../client/index.ts";
import type { RootOutletProps } from "../../client/src/impl_helpers.ts";

let shouldScroll = false;

const [latestEvent, setLatestEvent] = createSignal<RouteChangeEvent | null>(null);
const [loadersData, setLoadersData] = createSignal(ctx.get("loadersData"));
export { loadersData };

addRouteChangeListener((e) => {
	setLatestEvent(e);
	setLoadersData(ctx.get("loadersData"));
});

export function HwyRootOutlet<RD>(props: RootOutletProps<JSX.Element, RD>): JSX.Element {
	const idx = props.index ?? 0;
	const [currentImportURL, setCurrentImportURL] = createSignal(ctx.get("importURLs")?.[idx]);
	const [nextImportURL, setNextImportURL] = createSignal(ctx.get("importURLs")?.[idx + 1]);

	if (currentImportURL) {
		createEffect(() => {
			const e = latestEvent();
			if (!e) return;

			const newCurrentImportURL = ctx.get("importURLs")?.[idx];
			const newNextImportURL = ctx.get("importURLs")?.[idx + 1];

			if (currentImportURL() !== newCurrentImportURL) setCurrentImportURL(newCurrentImportURL);
			if (nextImportURL() !== newNextImportURL) setNextImportURL(newNextImportURL);

			if (idx === 0 && e.detail.scrollState) {
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

	const currentCompMemo = createMemo(() => {
		currentImportURL();
		return ctx.get("activeComponents")?.[idx];
	});

	return (
		<ErrorBoundary fallback={<div>ERROR</div>}>
			<Show when={currentCompMemo()}>
				{currentCompMemo()({
					depth: idx,
					Outlet: (localProps: Record<string, any> | undefined) => {
						return <HwyRootOutlet {...localProps} {...props} index={idx + 1} />;
					},
				})}
			</Show>
		</ErrorBoundary>
	);
}

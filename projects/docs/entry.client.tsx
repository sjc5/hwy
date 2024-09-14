declare global {
	var process: { env: { NODE_ENV: string } };
}
if (process.env.NODE_ENV === "development") {
	await import("preact/debug");
}

import { addStatusListener, initClient } from "@hwy-js/client";
import { RootOutlet } from "@hwy-js/react";
import { StrictMode, hydrate, startTransition } from "preact/compat";
import { RootLayout } from "./pages/layout.js";

await initClient(() => {
	startTransition(() => {
		hydrate(
			<StrictMode>
				<RootOutlet
					fallbackErrorBoundary={() => <div>Something went wrong.</div>}
					layout={RootLayout}
				/>
			</StrictMode>,
			document.getElementById("root") as HTMLElement,
		);
	});
});

import NProgress from "nprogress";

addStatusListener((evt) => {
	if (evt.detail.isNavigating && !NProgress.isStarted()) {
		NProgress.start();
	} else {
		NProgress.done();
	}
});

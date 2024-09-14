import { getHwyClientGlobal } from "../../common/index.mjs";
import { initCustomHistory } from "./custom_history.js";
import { addAnchorClickListenener } from "./data_boost_listeners.js";

const hwyClientGlobal = getHwyClientGlobal();

export async function initClient(renderFn: () => void) {
	// HANDLE HISTORY STUFF
	initCustomHistory();

	// HANDLE COMPONENTS
	const components = await importComponents();
	hwyClientGlobal.set(
		"activeComponents",
		components.map((x) => x.default),
	);
	hwyClientGlobal.set(
		"activeErrorBoundaries",
		components.map((x) => x.ErrorBoundary),
	);

	// RUN THE RENDER FUNCTION
	renderFn();

	// INSTANTIATE GLOBAL EVENT LISTENERS
	addAnchorClickListenener();
}

function importComponents() {
	return Promise.all(
		hwyClientGlobal.get("importURLs").map((x) => {
			return import(("." + x).replace("public/dist/", ""));
		}),
	);
}

export function getAdHocData<T = any>(): T | undefined {
	return getHwyClientGlobal().get("adHocData");
}

export {
	addBuildIDListener,
	addRouteChangeListener,
	addStatusListener,
	devRevalidate,
	getBuildID,
	getCurrentRiverData,
	getHistoryInstance,
	getPrefetchHandlers,
	getRootEl,
	getStatus,
	initClient,
	makeLinkClickListenerFn,
	navigate,
	type RouteChangeEvent,
	revalidate,
	type StatusEvent,
	submit,
} from "./src/client.ts";
export { internal_RiverClientGlobal } from "./src/river_ctx.ts";
export type { Routes } from "./src/route_def_helpers.ts";

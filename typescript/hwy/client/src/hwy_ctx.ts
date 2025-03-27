// __TODO set up go/ts type sharing script

export type HeadBlock = {
	tag?: string;
	safeAttributes?: Record<string, string>;
	booleanAttributes?: Array<string>;
	innerHTML?: string;
};

type Meta = { title: string; metaHeadBlocks: Array<HeadBlock>; restHeadBlocks: Array<HeadBlock> };

type shared = {
	loadersData: Array<any>;
	importURLs: Array<string>;
	outermostErrorIndex: number;
	params: Record<string, string>;
	splatValues: Array<string>;
	coreData: any;
	buildID: string;
	activeErrorBoundaries: Array<any> | null;
	activeComponents: Array<any> | null;
};

export type GetRouteDataOutput = shared &
	Meta & {
		deps: Array<string>;
		cssBundles: Array<string>;
	};

const HWY_SYMBOL = Symbol.for("__hwy_internal__");

export type HwyClientGlobal = shared & {
	isDev: boolean;
	viteDevURL: string;
};

export function __getHwyClientGlobal() {
	const dangerousGlobalThis = globalThis as any;
	function get<K extends keyof HwyClientGlobal>(key: K) {
		return dangerousGlobalThis[HWY_SYMBOL][key] as HwyClientGlobal[K];
	}
	function set<K extends keyof HwyClientGlobal, V extends HwyClientGlobal[K]>(key: K, value: V) {
		dangerousGlobalThis[HWY_SYMBOL][key] = value;
	}
	return { get, set };
}

export const internal_HwyClientGlobal = __getHwyClientGlobal();

// to debug ctx in browser, paste this:
// const hwy_ctx = window[Symbol.for("__hwy_internal__")];

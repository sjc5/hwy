import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type NavigateProps,
	type NavigationControl,
	__getHwyClientGlobal,
	beginNavigation,
	navigationState,
} from "../src/client.ts";

let dom: JSDOM;
let mockGlobal: any;

describe("__getHwyClientGlobal", () => {
	beforeEach(() => {
		// Set up JSDOM environment
		dom = new JSDOM("<!DOCTYPE html><body></body>", { url: "https://example.com" });
		global.window = dom.window as unknown as Window & typeof globalThis;
		global.document = dom.window.document;

		// Set up mock global state
		mockGlobal = {};
		(globalThis as any)[Symbol.for("__hwy_internal__")] = mockGlobal;
	});

	afterEach(() => {
		// Clean up global state and JSDOM
		delete (globalThis as any)[Symbol.for("__hwy_internal__")];
		dom.window.close();
		global.window = undefined as any;
		global.document = undefined as any;
	});

	it("should get a value from the global state", () => {
		mockGlobal.params = { key: "value" };
		const { get } = __getHwyClientGlobal();
		expect(get("params")).toEqual({ key: "value" });
	});

	it("should set a value in the global state", () => {
		const { set, get } = __getHwyClientGlobal();
		set("buildID", "123");
		expect(get("buildID")).toBe("123");
	});

	it("should update existing global values correctly", () => {
		mockGlobal.activeComponents = [];
		const { set, get } = __getHwyClientGlobal();
		set("activeComponents", ["Component1"]);
		expect(get("activeComponents")).toEqual(["Component1"]);
	});
});

describe("beginNavigation", () => {
	let mockSetStatus: any;

	beforeEach(() => {
		// Reset navigation state and mock any necessary functions
		navigationState.navigations.clear();
		navigationState.activeUserNavigation = null;
		mockSetStatus = vi.fn();

		// Set up JSDOM environment
		dom = new JSDOM("<!DOCTYPE html><body></body>", { url: "https://example.com" });
		global.window = dom.window as unknown as Window & typeof globalThis;
		global.document = dom.window.document;
	});

	afterEach(() => {
		vi.restoreAllMocks(); // Restore any mocked functions
		dom.window.close(); // Clean up JSDOM environment
		global.window = undefined as any;
		global.document = undefined as any;
	});

	it("should start a new user navigation", () => {
		const props: NavigateProps = { href: "/test", navigationType: "userNavigation" };
		const _ = beginNavigation(props);

		expect(navigationState.activeUserNavigation).toBe("/test");
		expect(navigationState.navigations.has("/test")).toBe(true);
	});

	it("should upgrade prefetch to user navigation", () => {
		const prefetchControl: NavigationControl = {
			abortController: undefined,
			promise: Promise.resolve() as any,
		};
		navigationState.navigations.set("/test", { control: prefetchControl, type: "prefetch" });

		const props: NavigateProps = { href: "/test", navigationType: "userNavigation" };
		const control = beginNavigation(props);

		expect(control).toBe(prefetchControl); // Prefetch upgraded
		expect(navigationState.navigations.get("/test")?.type).toBe("userNavigation");
	});

	it("should not start duplicate prefetch", () => {
		const existingControl: NavigationControl = {
			abortController: undefined,
			promise: Promise.resolve() as any,
		};
		navigationState.navigations.set("/test", { control: existingControl, type: "prefetch" });

		const props: NavigateProps = { href: "/test", navigationType: "prefetch" };
		const control = beginNavigation(props);

		expect(control).toBe(existingControl); // Uses existing prefetch
	});
});

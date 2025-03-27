import { debounce } from "../debounce/debounce.ts";

export function addOnWindowFocusListener(callback: () => void): void {
	const debouncedCallback = debounce(callback, 10);
	window.addEventListener("focus", debouncedCallback);
	window.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") {
			debouncedCallback();
		}
	});
}

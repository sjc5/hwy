import type { NavigationType } from "./navigate.js";

const STATUS_EVENT_KEY = "hwy:status";

let isNavigating = false;
let isSubmitting = false;
let isRevalidating = false;

export function setStatus({
	type,
	value,
}: {
	type: NavigationType | "submission";
	value: boolean;
}) {
	if (type === "dev-revalidation") {
		return;
	}

	if (type === "revalidation") {
		isRevalidating = value;
	} else if (type === "submission") {
		isSubmitting = value;
	} else {
		isNavigating = value;
	}

	dispatchStatusEvent();
}

export type StatusEvent = {
	isNavigating: boolean;
	isSubmitting: boolean;
	isRevalidating: boolean;
};

let dispatchStatusEventDebounceTimer: number | undefined;

function dispatchStatusEvent() {
	clearTimeout(dispatchStatusEventDebounceTimer);

	dispatchStatusEventDebounceTimer = setTimeout(() => {
		window.dispatchEvent(
			new CustomEvent(STATUS_EVENT_KEY, {
				detail: {
					isRevalidating,
					isSubmitting,
					isNavigating,
				} satisfies StatusEvent,
			}),
		);
	}, 1);
}

export function getStatus(): StatusEvent {
	return {
		isNavigating,
		isSubmitting,
		isRevalidating,
	};
}

type CleanupFunction = () => void;

export function addStatusListener(
	listener: (event: CustomEvent<StatusEvent>) => void,
): CleanupFunction {
	window.addEventListener(STATUS_EVENT_KEY, listener as any);
	return () => {
		window.removeEventListener(STATUS_EVENT_KEY, listener as any);
	};
}

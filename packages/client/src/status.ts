import { NavigationType } from "./navigate.js";

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
  if (type === "revalidation") {
    isRevalidating = value;
  } else if (type === "submission") {
    isSubmitting = value;
  } else {
    isNavigating = value;
  }

  dispatchStatusEvent();
}

type StatusEvent = {
  isNavigating: boolean;
  isSubmitting: boolean;
  isRevalidating: boolean;
};

function dispatchStatusEvent() {
  window.dispatchEvent(
    new CustomEvent(STATUS_EVENT_KEY, {
      detail: {
        isRevalidating,
        isSubmitting,
        isNavigating,
      } satisfies StatusEvent,
    }),
  );
}

export function getStatus() {
  return {
    isNavigating,
    isSubmitting,
    isRevalidating,
  };
}

export function addStatusListener(
  listener: (event: CustomEvent<StatusEvent>) => void,
) {
  window.addEventListener(STATUS_EVENT_KEY, listener as any);
}

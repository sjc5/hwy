const BUILD_ID_CHANGED_EVENT_KEY = "hwy:build-id";

export function dispatchBuildIDChangedEvent() {
  window.dispatchEvent(new CustomEvent(BUILD_ID_CHANGED_EVENT_KEY));
}

export function addBuildIDChangedListener(listener: () => void) {
  window.addEventListener(BUILD_ID_CHANGED_EVENT_KEY, listener);
}

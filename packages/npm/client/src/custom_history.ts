import { Update, createBrowserHistory } from "history";
import { internalNavigate } from "./navigate.js";
import { scrollStateMapSubKey } from "./scroll_restoration.js";

export let customHistory: ReturnType<typeof createBrowserHistory>;
let lastKnownCustomLocation: (typeof customHistory)["location"];

export function initializeCustomHistory() {
  customHistory = createBrowserHistory();
  lastKnownCustomLocation = customHistory.location;
  customHistory.listen(customHistoryListener);
  setNativeScrollRestorationToManual();
}

function setNativeScrollRestorationToManual() {
  if (history.scrollRestoration && history.scrollRestoration !== "manual") {
    history.scrollRestoration = "manual";
  }
}

async function customHistoryListener({ action, location }: Update) {
  // save current scroll state to map
  scrollStateMapSubKey.set(lastKnownCustomLocation.key, {
    x: window.scrollX,
    y: window.scrollY,
  });

  if (action === "POP") {
    if (
      location.key !== lastKnownCustomLocation.key &&
      (location.pathname !== lastKnownCustomLocation.pathname ||
        location.search !== lastKnownCustomLocation.search)
    ) {
      await internalNavigate({
        href: window.location.href,
        navigationType: "browserHistory",
        scrollStateToRestore: scrollStateMapSubKey.read(location.key),
      });
    }
  }

  // now set lastKnownCustomLocation to new location
  lastKnownCustomLocation = location;
}

export function getCustomHistory() {
  return customHistory;
}

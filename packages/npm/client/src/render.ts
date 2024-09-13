import {
  GetRouteDataOutput,
  HWY_ROUTE_CHANGE_EVENT_KEY,
  HwyClientGlobalKey,
  RouteChangeEventDetail,
  ScrollState,
  getHwyClientGlobal,
} from "../../common/index.mjs";
import { dispatchBuildIDEvent } from "./build_id.js";
import { customHistory } from "./custom_history.js";
import { head } from "./head.js";
import { NavigationType } from "./navigate.js";

const hwyClientGlobal = getHwyClientGlobal();

export async function reRenderApp({
  json,
  navigationType,
  runHistoryOptions,
}: {
  json: GetRouteDataOutput;
  navigationType: NavigationType;
  runHistoryOptions?: {
    href: string;
    scrollStateToRestore?: ScrollState;
    replace?: boolean;
  };
}) {
  // Changing the title instantly makes it feel faster
  // The temp textarea trick is to decode any HTML entities in the title
  const tempTxt = document.createElement("textarea");
  tempTxt.innerHTML = json.title ?? "";
  document.title = tempTxt.value;

  // Add missing deps modulepreload links
  for (const x of json.deps ?? []) {
    const href = "/public/" + x;
    if (document.querySelector(`link[href="${href}"]`)) {
      continue;
    }
    const newLink = document.createElement("link");
    newLink.rel = "modulepreload";
    newLink.href = href;
    document.head.appendChild(newLink);
  }

  // Create an array to store promises for CSS bundle preloads
  const cssBundlePromises = [];

  // Add missing css bundle preload links
  for (const x of json.cssBundles ?? []) {
    const href = "/public/" + x;
    if (document.querySelector(`link[href="${href}"]`)) {
      continue;
    }
    const newLink = document.createElement("link");
    newLink.rel = "preload";
    newLink.href = href;
    newLink.as = "style";
    document.head.appendChild(newLink);

    // Create a promise for this CSS bundle preload
    const preloadPromise = new Promise((resolve, reject) => {
      newLink.onload = resolve;
      newLink.onerror = reject;
    });
    cssBundlePromises.push(preloadPromise);
  }

  const oldList = hwyClientGlobal.get("importURLs");
  const newList = json.importURLs ?? [];

  let updatedList: {
    importPath: string;
    type: "new" | "same";
  }[] = [];

  // compare and populate updatedList
  for (let i = 0; i < Math.max(oldList.length, newList.length); i++) {
    if (i < oldList.length && i < newList.length && oldList[i] === newList[i]) {
      updatedList.push({
        importPath: oldList[i],
        type: "same",
      });
    } else if (i < newList.length) {
      updatedList.push({
        importPath: newList[i],
        type: "new",
      });
    }
  }

  // get new components only
  const components = updatedList.map((x: any) => {
    if (x.type === "new") {
      return import(("." + x.importPath).replace("public/dist/", ""));
    }
    return undefined;
  });
  const awaitedComps = await Promise.all(components);
  const awaitedDefaults = awaitedComps.map((x) => x?.default);
  const awaitedErrorBoundaries = awaitedComps.map((x) => x?.ErrorBoundary);

  // placeholder list based on old list
  let newActiveComps = hwyClientGlobal.get("activeComponents");
  let newActiveErrorBoundaries = hwyClientGlobal.get("activeErrorBoundaries");

  // replace stale components with new ones where applicable
  for (let i = 0; i < awaitedDefaults.length; i++) {
    if (awaitedDefaults[i]) {
      newActiveComps[i] = awaitedDefaults[i];
    }
    if (awaitedErrorBoundaries[i]) {
      newActiveErrorBoundaries[i] = awaitedErrorBoundaries[i];
    }
  }

  // delete any remaining stale components
  if (oldList.length > newList.length) {
    newActiveComps = newActiveComps.slice(0, newList.length);
    newActiveErrorBoundaries = newActiveErrorBoundaries.slice(
      0,
      newList.length,
    );
  }

  // NOW ACTUALLY SET EVERYTHING
  hwyClientGlobal.set("activeComponents", newActiveComps);
  hwyClientGlobal.set("activeErrorBoundaries", newActiveErrorBoundaries);

  const identicalKeysToSet = [
    "loadersData",
    "importURLs",
    "outermostErrorIndex",
    "splatSegments",
    "params",
    "adHocData",
  ] as const satisfies ReadonlyArray<HwyClientGlobalKey>;

  for (const key of identicalKeysToSet) {
    hwyClientGlobal.set(key, json[key]);
  }

  const oldID = hwyClientGlobal.get("buildID");
  const newID = json.buildID;
  if (newID !== oldID) {
    dispatchBuildIDEvent({ newID, oldID });
    hwyClientGlobal.set("buildID", json.buildID);
  }

  let highestIndex: number | undefined;
  for (let i = 0; i < updatedList.length; i++) {
    if (updatedList[i].type === "new") {
      highestIndex = i;
      break;
    }
  }

  let scrollStateToDispatch: ScrollState | undefined;

  if (runHistoryOptions) {
    // __TODO
    // - scroll to top on link clicks, but provide an opt-out
    // - scroll to top on form responses, but provide an opt-out

    const { href, scrollStateToRestore, replace } = runHistoryOptions;

    if (navigationType === "userNavigation" || navigationType === "redirect") {
      if (href !== location.href && navigationType !== "redirect" && !replace) {
        customHistory.push(href);
      } else {
        customHistory.replace(href);
      }
      scrollStateToDispatch = { x: 0, y: 0 };
    }

    if (navigationType === "browserHistory" && scrollStateToRestore) {
      scrollStateToDispatch = scrollStateToRestore;
    }

    // if revalidation, do nothing
  }

  // dispatch event
  const detail: RouteChangeEventDetail = {
    index: highestIndex ?? 0,
    scrollState: scrollStateToDispatch,
  } as const;

  // Wait for all CSS bundle preloads to complete
  if (cssBundlePromises.length > 0) {
    try {
      console.log("Waiting for CSS bundle preloads to complete...");
      await Promise.all(cssBundlePromises);
      console.log("CSS bundle preloads completed.");
    } catch (error) {
      console.error("Error preloading CSS bundles:", error);
    }
  }

  // Now that CSS is preloaded, update the DOM
  window.requestAnimationFrame(() => {
    // remove old css bundles
    const actualRouteStyleSheetsOnPage = document.querySelectorAll(
      "[data-hwy-css-bundle]",
    );
    actualRouteStyleSheetsOnPage.forEach((x) => {
      const attr = x.getAttribute(cssBundleDataAttr)!;
      if (!json.cssBundles?.includes(attr)) {
        x.remove();
      }
    });

    // add new css bundles
    json.cssBundles?.forEach((x) => {
      const href = "/public/" + x;
      if (document.querySelector(`link[${cssBundleDataAttr}="${x}"]`)) {
        return;
      }
      const newLink = document.createElement("link");
      newLink.rel = "stylesheet";
      newLink.href = href;
      newLink.setAttribute(cssBundleDataAttr, x);
      document.head.appendChild(newLink);
    });
  });

  window.dispatchEvent(new CustomEvent(HWY_ROUTE_CHANGE_EVENT_KEY, { detail }));

  head.removeAllBetween("meta");
  head.addBlocks("meta", json.metaHeadBlocks ?? []);
  head.removeAllBetween("rest");
  head.addBlocks("rest", json.restHeadBlocks ?? []);
}

const cssBundleDataAttr = "data-hwy-css-bundle";

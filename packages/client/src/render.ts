import {
  HWY_ROUTE_CHANGE_EVENT_KEY,
  HwyClientGlobalKey,
  getHwyClientGlobal,
} from "../../common/index.mjs";
import { dispatchBuildIDChangedEvent } from "./build_id.js";
import { head } from "./head.js";
import { NavigationType } from "./navigate.js";

const hwyClientGlobal = getHwyClientGlobal();

export async function reRenderApp({
  json,
  navigationType,
}: {
  json: any;
  navigationType: NavigationType;
}) {
  // Changing the title instantly makes it feel faster
  document.title = json.title;

  const oldList = hwyClientGlobal.get("importURLs");
  const newList = json.importURLs;

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
  const awaitedDefaults = awaitedComps.map((x) => (x ? x.default : undefined));

  // placeholder list based on old list
  let newActiveComps = hwyClientGlobal.get("activeComponents");

  // replace stale components with new ones where applicable
  for (let i = 0; i < awaitedDefaults.length; i++) {
    if (awaitedDefaults[i]) {
      newActiveComps[i] = awaitedDefaults[i];
    }
  }

  // delete any remaining stale components
  if (oldList.length > newList.length) {
    newActiveComps = newActiveComps.slice(0, newList.length);
  }

  // NOW ACTUALLY SET EVERYTHING
  hwyClientGlobal.set("activeComponents", newActiveComps);

  const identicalKeysToSet = [
    "activeErrorBoundaries",
    "loadersData",
    "importURLs",
    "outermostErrorBoundaryIndex",
    "splatSegments",
    "params",
    "adHocData",
  ] as const satisfies ReadonlyArray<HwyClientGlobalKey>;

  for (const key of identicalKeysToSet) {
    hwyClientGlobal.set(key, json[key]);
  }

  if (json.buildID !== hwyClientGlobal.get("buildID")) {
    dispatchBuildIDChangedEvent();
    hwyClientGlobal.set("buildID", json.buildID);
  }

  if (navigationType !== "revalidation") {
    hwyClientGlobal.set("actionData", json.actionData);
  }

  let highestIndex: number | undefined;
  if (navigationType !== "revalidation") {
    for (let i = 0; i < updatedList.length; i++) {
      if (updatedList[i].type === "new") {
        highestIndex = i;
        break;
      }
    }
  } else {
    for (let i = 0; i < (json.actionData as any[]).length; i++) {
      if (json.actionData[i] !== undefined) {
        highestIndex = i;
        break;
      }
    }
  }

  // dispatch event
  const detail = { index: highestIndex ?? 0 };
  window.dispatchEvent(new CustomEvent(HWY_ROUTE_CHANGE_EVENT_KEY, { detail }));

  head.removeAllBetween("meta");
  head.addBlocks("meta", json.metaHeadBlocks);
  head.removeAllBetween("rest");
  head.addBlocks("rest", json.restHeadBlocks);
}

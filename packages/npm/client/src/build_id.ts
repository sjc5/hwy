import { getHwyClientGlobal } from "../../common/index.mjs";

const hwyClientGlobal = getHwyClientGlobal();

const BUILD_ID_EVENT_KEY = "hwy:build-id";

type BuildIDEvent = { oldID: string; newID: string };

export function dispatchBuildIDEvent(detail: BuildIDEvent) {
  window.dispatchEvent(new CustomEvent(BUILD_ID_EVENT_KEY, { detail }));
}

export function addBuildIDListener(
  listener: (event: CustomEvent<BuildIDEvent>) => void,
) {
  window.addEventListener(BUILD_ID_EVENT_KEY, listener as any);
}

export function getBuildID() {
  return hwyClientGlobal.get("buildID") as string;
}

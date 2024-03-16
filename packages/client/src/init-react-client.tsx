import { createBrowserHistory } from "history";
import { startTransition } from "react";
import {
  CLIENT_KEYS,
  HWY_PREFIX,
  get_hwy_client_global,
} from "../../common/index.mjs";

let isNavigating = false;
let isSubmitting = false;
let isRevalidating = false;

const abort_controllers = new Map<string, AbortController>();

function handle_abort_controller(key: string) {
  const needs_abort = abort_controllers.has(key);
  if (needs_abort) {
    const controller = abort_controllers.get(key);
    controller?.abort();
    abort_controllers.delete(key);
  }
  const new_controller = new AbortController();
  abort_controllers.set(key, new_controller);
  return { abort_controller: new_controller, did_abort: needs_abort };
}

const hwy_client_global = get_hwy_client_global();

function getIsInternalLink(href: string) {
  try {
    if (!href.startsWith("http://") && !href.startsWith("https://")) {
      return true;
    }
    const link_url = new URL(href);
    const current_origin = window.location.origin;
    return link_url.origin === current_origin;
  } catch (e) {
    console.error("Invalid URL:", href);
    return false;
  }
}

let customHistory: ReturnType<typeof createBrowserHistory>;
let lastKnownCustomLocation: (typeof customHistory)["location"];

const scrollStateMapKey = "__hwy__scrollStateMap";
type ScrollStateMap = Map<string, { x: number; y: number }>;

function getScrollStateMapFromLocalStorage() {
  const scrollStateMapString = localStorage.getItem(scrollStateMapKey);
  let scrollStateMap: ScrollStateMap;
  if (scrollStateMapString) {
    scrollStateMap = new Map(JSON.parse(scrollStateMapString));
  } else {
    scrollStateMap = new Map();
  }
  return scrollStateMap;
}

function setScrollStateMapToLocalStorage(newScrollStateMap: ScrollStateMap) {
  localStorage.setItem(
    scrollStateMapKey,
    JSON.stringify(Array.from(newScrollStateMap.entries())),
  );
}

function setScrollStateMapSubKey(key: string, value: { x: number; y: number }) {
  const scrollStateMap = getScrollStateMapFromLocalStorage();
  scrollStateMap.set(key, value);

  // if new item would brought it over 50 entries, delete the oldest one
  if (scrollStateMap.size > 50) {
    const oldestKey = Array.from(scrollStateMap.keys())[0];
    scrollStateMap.delete(oldestKey);
  }

  setScrollStateMapToLocalStorage(scrollStateMap);
}

function readScrollStateMapSubKey(key: string) {
  const scrollStateMap = getScrollStateMapFromLocalStorage();
  return scrollStateMap.get(key);
}

function getShouldPreventLinkDefault(event: MouseEvent) {
  const anchor = (event.target as HTMLElement).closest("a");

  const should_prevent_default =
    anchor && // ignore clicks with no anchor
    anchor.target !== "_blank" && // ignore new tabs
    event.button !== 1 && // middle mouse button click
    !anchor.href.startsWith("#") && // ignore hash links
    !anchor.hasAttribute("download") && // ignore downloads
    !event.ctrlKey && // ignore ctrl+click
    !event.shiftKey && // ignore shift+click
    !event.metaKey && // ignore cmd+click
    !event.altKey && // ignore alt+click
    getIsInternalLink(anchor.href); // ignore external links

  return should_prevent_default;
}

async function initReactClient(hydrateFn: () => void) {
  customHistory = createBrowserHistory();

  lastKnownCustomLocation = customHistory.location;

  customHistory.listen(async function ({ action, location }) {
    if (action === "POP") {
      if (
        location.key !== lastKnownCustomLocation.key &&
        (location.pathname !== lastKnownCustomLocation.pathname ||
          location.search !== lastKnownCustomLocation.search)
      ) {
        await __navigate({
          href: window.location.href,
          navigationType: "browserHistory",
          scrollStateToRestore: readScrollStateMapSubKey(
            customHistory.location.key,
          ),
        });
      }
    }
  });

  customHistory.listen(({ action, location }) => {
    // save current scroll state to map
    setScrollStateMapSubKey(lastKnownCustomLocation.key, {
      x: window.scrollX,
      y: window.scrollY,
    });

    // now set lastKnownCustomLocation to new location
    lastKnownCustomLocation = location;
  });

  if (history.scrollRestoration && history.scrollRestoration !== "manual") {
    history.scrollRestoration = "manual";
  }

  const components = hwy_client_global.get("activePaths").map((x: any) => {
    return import(("." + x).replace("public/dist/", ""));
  });

  const awaited_components = await Promise.all(components);

  hwy_client_global.set(
    "activeComponents",
    awaited_components.map((x, i) => x.default),
  );

  hwy_client_global.set(
    "activeErrorBoundaries",
    awaited_components.map((x) => x.ErrorBoundary),
  );

  startTransition(hydrateFn);

  document.body.addEventListener("click", async function (event) {
    const anchor = (event.target as HTMLElement).closest("a");

    if (!anchor || !anchor.dataset.boost || event.defaultPrevented) {
      return;
    }

    if (getShouldPreventLinkDefault(event)) {
      event.preventDefault();
      await __navigate({
        href: anchor.href,
        navigationType: "userNavigation",
      });
    }
  });

  window.addEventListener("submit", async function (event) {
    const form = event.target as HTMLFormElement;

    if (!form.dataset.boost || event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    const action = form.action;
    const method = form.method;

    const formData = new FormData(form);

    const submit_res = await submit(action || window.location.href, {
      method,
      body: method.toLowerCase() === "get" ? undefined : formData,
    });

    if (submit_res.success) {
      const json = await submit_res.response.json();
      hwy_client_global.set("actionData", json.actionData);
      reRenderApp({ json, navigationType: "revalidation" });
    } else {
      console.error(submit_res.error);
    }
  });
}

type NavigationType =
  | "browserHistory"
  | "userNavigation"
  | "revalidation"
  | "redirect"
  | "buildIdCheck";

async function handle_redirects(props: {
  abort_controller: AbortController;
  url: URL;
  requestInit?: RequestInit;
}) {
  let res;

  const noBody =
    !props.requestInit?.method ||
    props.requestInit?.method.toLowerCase() === "get" ||
    props.requestInit?.body === undefined;

  const bodyParentObj = noBody
    ? {}
    : {
        body:
          props.requestInit?.body instanceof FormData
            ? props.requestInit.body
            : typeof props.requestInit?.body === "string"
              ? props.requestInit.body
              : JSON.stringify(props.requestInit?.body),
      };

  try {
    res = await fetch(props.url, {
      signal: props.abort_controller.signal,
      ...props.requestInit,
      ...bodyParentObj,
    });

    if (res?.redirected) {
      const new_url = new URL(res.url);

      if (!getIsInternalLink(new_url.href)) {
        // external link, hard redirecting
        window.location.href = new_url.href;
        return;
      }

      // internal link, soft redirecting
      await __navigate({
        href: new_url.href,
        navigationType: "redirect",
      });

      return;
    }
  } catch (e) {
    // If this was an attempted redirect,
    // potentially a CORS error here
    // Recommend returning a JSON instruction to redirect on client
    // with window.location.href = new_url.href;
    console.error(e);
  }

  return res;
}

function set_status({
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
  } else if (type !== "buildIdCheck") {
    isNavigating = value;
  }
}

async function __navigate(props: {
  href: string;
  navigationType: NavigationType;
  scrollStateToRestore?: { x: number; y: number };
  replace?: boolean;
}) {
  set_status({ type: props.navigationType, value: true });

  const abort_controller_key =
    props.href === "." || props.href === window.location.href
      ? "revalidate"
      : "navigate";
  const { abort_controller } = handle_abort_controller(abort_controller_key);

  try {
    const url = new URL(props.href, window.location.origin);

    url.searchParams.set(`${HWY_PREFIX}json`, "1");

    const res = await handle_redirects({
      abort_controller,
      url,
    });

    abort_controllers.delete(abort_controller_key);

    if (!res || res.status !== 200) {
      set_status({ type: props.navigationType, value: false });
      return;
    }

    const json = await res?.json();

    if (!json) {
      throw new Error("No JSON response");
    }

    if (json.buildId !== hwy_client_global.get("buildId")) {
      window.location.href = props.href;
      return;
    }

    if (props.navigationType === "buildIdCheck") {
      set_status({ type: props.navigationType, value: false });
      return;
    }

    await reRenderApp({
      json,
      navigationType: props.navigationType,
    });

    // __TODO scroll to top on link clicks, but provide an opt-out
    // __TODO scroll to top on form responses, but provide an opt-out

    if (
      props.navigationType === "userNavigation" ||
      props.navigationType === "redirect"
    ) {
      if (
        props.href !== location.href &&
        props.navigationType !== "redirect" &&
        !props.replace
      ) {
        customHistory.push(props.href);
      } else {
        customHistory.replace(props.href);
      }
      window.scrollTo(0, 0);
    }

    if (
      props.navigationType === "browserHistory" &&
      props.scrollStateToRestore
    ) {
      window.scrollTo(
        props.scrollStateToRestore.x,
        props.scrollStateToRestore.y,
      );
    }

    set_status({ type: props.navigationType, value: false });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // eat
    } else {
      console.error(error);
      set_status({ type: props.navigationType, value: false });
    }
  }
}

// Take in a custom stringifier for the body, or build in devalue?
// Build in Ky?
// Make this take generics
// Allow "boost=`false`" on any form or link

async function submit(
  url: string | URL,
  requestInit?: RequestInit,
  options?: {
    skipOnSuccessRevalidation?: boolean;
  },
): Promise<
  | {
      success: true;
      response: Response;
    }
  | { success: false; error: string }
> {
  set_status({ type: "submission", value: true });

  const abort_controller_key = url + (requestInit?.method || "");
  const { abort_controller, did_abort } =
    handle_abort_controller(abort_controller_key);

  const url_to_use = new URL(url, window.location.origin);
  url_to_use.searchParams.set(`${HWY_PREFIX}json`, "1");

  try {
    const response = await handle_redirects({
      abort_controller,
      url: url_to_use,
      requestInit,
    });

    abort_controllers.delete(abort_controller_key);

    if (
      response &&
      (String(response?.status).startsWith("4") ||
        String(response?.status).startsWith("5"))
    ) {
      set_status({ type: "submission", value: false });

      return {
        success: false,
        error: String(response.status),
      } as const;
    }

    const IS_GET = requestInit?.method?.toLowerCase() === "get";

    if (did_abort) {
      if (!IS_GET) {
        // revalidate
        await __navigate({
          href: location.href,
          navigationType: "revalidation",
        }); // this shuts off loading indicator too
      }

      return {
        success: false,
        error: "Aborted",
      } as const;
    } else {
      if (!response?.ok) {
        return {
          success: false,
          error: response?.status ? String(response.status) : "Unknown",
        } as const;
      }

      if (!IS_GET) {
        // HWY __TODO This should probably be a specific endpoint, otherwise this might fail if the page doesn't exist anymore
        // __TODO need to remind myself why this is here specifically
        await __navigate({
          href: location.href,
          navigationType: "buildIdCheck",
        });
      }

      set_status({ type: "submission", value: false });
    }

    return {
      success: true,
      response,
    } as const;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // eat
      return {
        success: false,
        error: "Aborted",
      } as const;
    } else {
      console.error(error);
      set_status({ type: "submission", value: false });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as const;
    }
  }
}

async function reRenderApp({
  json,
  navigationType,
}: {
  json: any;
  navigationType: NavigationType;
}) {
  const old_list = hwy_client_global.get("activePaths");
  const new_list = json.activePaths;

  let updated_list: {
    importPath: string;
    type: "new" | "same";
  }[] = [];

  // compare and populate updated_list
  for (let i = 0; i < Math.max(old_list.length, new_list.length); i++) {
    if (
      i < old_list.length &&
      i < new_list.length &&
      old_list[i] === new_list[i]
    ) {
      updated_list.push({
        importPath: old_list[i],
        type: "same",
      });
    } else if (i < new_list.length) {
      updated_list.push({
        importPath: new_list[i],
        type: "new",
      });
    }
  }

  // get new components only
  const components = updated_list.map((x: any) => {
    if (x.type === "new") {
      return import(("." + x.importPath).replace("public/dist/", ""));
    }
    return undefined;
  });
  const awaited_components = await Promise.all(components);
  const awaited_defaults = awaited_components.map((x) =>
    x ? x.default : undefined,
  );

  // placeholder list based on old list
  let new_active_components = hwy_client_global.get("activeComponents");

  // replace stale components with new ones where applicable
  for (let i = 0; i < awaited_defaults.length; i++) {
    if (awaited_defaults[i]) {
      new_active_components[i] = awaited_defaults[i];
    }
  }

  // delete any remaining stale components
  if (old_list.length > new_list.length) {
    new_active_components = new_active_components.slice(0, new_list.length);
  }

  // NOW ACTUALLY SET EVERYTHING
  hwy_client_global.set("activeComponents", new_active_components);

  const identical_keys_to_set = [
    "activeErrorBoundaries",
    "activeData",
    "activePaths",
    "outermostErrorBoundaryIndex",
    "splatSegments",
    "params",
    "adHocData",
    "buildId",
  ] as const satisfies ReadonlyArray<(typeof CLIENT_KEYS)[number]>;

  for (const key of identical_keys_to_set) {
    hwy_client_global.set(key, json[key]);
  }

  if (navigationType !== "revalidation") {
    hwy_client_global.set("actionData", json.actionData);
  }

  let highest_index: number | undefined;
  if (navigationType !== "revalidation") {
    for (let i = 0; i < updated_list.length; i++) {
      if (updated_list[i].type === "new") {
        highest_index = i;
        break;
      }
    }
  } else {
    for (let i = 0; i < (json.actionData as any[]).length; i++) {
      if (json.actionData[i] !== undefined) {
        highest_index = i;
        break;
      }
    }
  }

  // dispatch event
  const event = new CustomEvent("hwy:route-change", {
    detail: { index: highest_index },
  });
  window.dispatchEvent(event);

  document.title = json.title;
  removeAllBetween("meta");
  addBlocksToHead("meta", json.metaHeadBlocks);
  removeAllBetween("rest");
  addBlocksToHead("rest", json.restHeadBlocks);
}

//////////////////////////////
// head stuff

function getStartAndEndElements(type: "meta" | "rest") {
  const startElement = document.head.querySelector(
    `[data-hwy="${type}-start"]`,
  );
  const endElement = document.head.querySelector(`[data-hwy="${type}-end"]`);
  return { startElement, endElement };
}

function removeAllBetween(type: "meta" | "rest") {
  const { startElement, endElement } = getStartAndEndElements(type);
  if (!startElement || !endElement) {
    return;
  }

  let currentElement = startElement.nextSibling as HTMLElement | null;

  while (currentElement && currentElement !== endElement) {
    const nextElement = currentElement.nextSibling;
    currentElement.remove();
    currentElement = nextElement as HTMLElement | null;
  }
}

function addBlocksToHead(type: "meta" | "rest", blocks: Array<any>) {
  const { startElement, endElement } = getStartAndEndElements(type);
  if (!startElement || !endElement) {
    return;
  }

  blocks.forEach((block) => {
    let newElement: HTMLElement | null = null;

    if (block.title) {
      newElement = document.createElement("title");
      newElement.textContent = block.title;
    } else if (block.tag) {
      newElement = document.createElement(block.tag);
      if (block.attributes) {
        Object.keys(block.attributes).forEach((key) => {
          newElement?.setAttribute(key, block.attributes[key]);
        });
      }
    }

    if (newElement) {
      document.head.insertBefore(newElement, endElement);
    }
  });
}

async function navigate(href: string, options?: { replace?: boolean }) {
  await __navigate({
    href,
    navigationType: "userNavigation",
    replace: options?.replace,
  });
}

function getCustomHistory() {
  return customHistory;
}
function getIsNavigating() {
  return isNavigating;
}
function getIsRevalidating() {
  return isRevalidating;
}
function getIsSubmitting() {
  return isSubmitting;
}
export {
  getCustomHistory,
  getIsInternalLink,
  getIsNavigating,
  getIsRevalidating,
  getIsSubmitting,
  getShouldPreventLinkDefault,
  initReactClient,
  navigate,
  submit,
};
// __TODO -- return a revalidation function (consider not auto-revalidating)

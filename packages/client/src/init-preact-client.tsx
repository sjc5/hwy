import { signal } from "@preact/signals";
import { createBrowserHistory } from "history";
import { hydrate, type ComponentChild } from "preact";
import {
  CLIENT_SIGNAL_KEYS,
  HWY_PREFIX,
  get_hwy_client_global,
} from "../../common/index.mjs";

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

function is_internal_link(href: string) {
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
let lastKnownKey = "default";

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

async function initPreactClient(props: {
  elementToHydrate: HTMLElement;
  hydrateWith: ComponentChild;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}) {
  customHistory = createBrowserHistory();

  customHistory.listen(({ action, location }) => {
    // save current scroll state to map
    setScrollStateMapSubKey(lastKnownKey, {
      x: window.scrollX,
      y: window.scrollY,
    });

    // now set lastKnownKey to new location key
    lastKnownKey = location.key;
  });

  if (history.scrollRestoration && history.scrollRestoration !== "manual") {
    history.scrollRestoration = "manual";
  }

  for (const key of CLIENT_SIGNAL_KEYS) {
    hwy_client_global.set_signal(
      key,
      signal(
        hwy_client_global
          // it's not really a signal here, just want raw value which is what "get_signal" does
          .get_signal(key),
      ),
    );
  }

  const components = hwy_client_global.get("activePaths").map((x: any) => {
    return import(("." + x).replace("public/dist/", ""));
  });

  const awaited_components = await Promise.all(components);

  const fallbackIndex = hwy_client_global.get("fallbackIndex");

  hwy_client_global.set(
    "activeComponents",
    awaited_components.map((x, i) => {
      if (fallbackIndex === -1) {
        return x.default;
      }
      if (i === fallbackIndex) {
        return x.Fallback;
      }
      return x.default;
    }),
  );

  hwy_client_global.set(
    "activeErrorBoundaries",
    awaited_components.map((x) => x.ErrorBoundary),
  );

  hydrate(props.hydrateWith, props.elementToHydrate);

  document.body.addEventListener("click", async function (event) {
    // @ts-ignore
    const anchor = event.target?.closest("a");

    const should_treat_as_ajax =
      anchor && // ignore clicks with no anchor
      anchor.target !== "_blank" && // ignore new tabs
      event.button !== 1 && // middle mouse button click
      !anchor.href.startsWith("#") && // ignore hash links
      !anchor.hasAttribute("download") && // ignore downloads
      !event.ctrlKey && // ignore ctrl+click
      !event.shiftKey && // ignore shift+click
      !event.metaKey && // ignore cmd+click
      !event.altKey && // ignore alt+click
      is_internal_link(anchor.href); // ignore external links

    if (should_treat_as_ajax) {
      event.preventDefault();
      await navigate({
        href: anchor.href,
        navigationType: "userNavigation",
      });
    }
  });

  window.addEventListener("popstate", async function (event) {
    await navigate({
      href: location.href,
      navigationType: "browserHistory",
      scrollStateToRestore: readScrollStateMapSubKey(
        customHistory.location.key,
      ),
    });
  });

  hwy_client_global.set("globalOnLoadStart", props?.onLoadStart);
  hwy_client_global.set("globalOnLoadEnd", props?.onLoadEnd);

  window.addEventListener("submit", async function (event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;

    // run original form onsubmit if it exists
    if (form.onsubmit) {
      const res = await form.onsubmit(event);

      if (res === false) {
        return;
      }
    }

    const action = form.action;
    const method = form.method;

    const formData = new FormData(form);

    await submit({
      to: action,
      data: formData,
      method: method as any,
    });
  });

  if (fallbackIndex !== -1) {
    navigate({
      href: location.href,
      navigationType: "revalidation",
    });
  }
}

type NavigationType =
  | "browserHistory"
  | "userNavigation"
  | "revalidation"
  | "redirect";

function getRandom() {
  return Math.random().toString(36).substring(2, 15);
}

async function navigate(props: {
  href: string;
  navigationType: NavigationType;
  isSecondTimeRunning?: boolean;
  scrollStateToRestore?: { x: number; y: number };
}) {
  hwy_client_global.get("globalOnLoadStart")?.();

  const abort_controller_key = props.href === "." ? "revalidate" : "navigate";
  const { abort_controller } = handle_abort_controller(abort_controller_key);

  try {
    const url = new URL(props.href, window.location.origin);

    url.searchParams.set(`${HWY_PREFIX}json`, "1");

    let res;

    const isFirstTimeRunning = !props.isSecondTimeRunning;

    if (isFirstTimeRunning) {
      // first time running, fetching WITH redir manual
      res = await fetch(url, {
        signal: abort_controller.signal,
        redirect: "manual",
      });
    } else {
      try {
        // second time running, fetching withOUT redir manual
        res = await fetch(url, {
          signal: abort_controller.signal,
        });
      } catch (e) {
        if (e instanceof Error && e.name === "TypeError") {
          // probs a cors error, fetching again WITH redir manual
          res = await fetch(url, {
            signal: abort_controller.signal,
            redirect: "manual",
          });

          // now hard redirect
          window.location.href = res.url;
          return;
        }
      }
    }

    // TO-DO I think this redirect logic is wrong and needs to be re-created from navitagte function?
    if (res?.redirected) {
      const new_url = new URL(res.url);

      if (!is_internal_link(new_url.href)) {
        // external link, hard redirecting
        window.location.href = new_url.href;
        return;
      }

      // internal link, soft redirecting
      await navigate({
        href: new_url.href,
        navigationType: "redirect",
      });
      return;
    }

    if (res?.type === "opaqueredirect") {
      // run again with "isSecondTimeRunning" set to false
      await navigate({
        href: res.url,
        navigationType: "redirect",
        isSecondTimeRunning: true /* important */,
      });
      return;
    }

    const json = await res?.json();

    abort_controllers.delete(abort_controller_key);

    if (!json) {
      throw new Error("No JSON response");
    }

    await reRenderApp({
      json,
      navigationType: props.navigationType,
    });

    // TO-DO scroll to top on link clicks, but provide an opt-out
    // TO-DO scroll to top on form responses, but provide an opt-out

    if (props.navigationType === "userNavigation") {
      if (props.href !== location.href) {
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

    hwy_client_global.get("globalOnLoadEnd")?.();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // eat
    } else {
      console.error(error);
      hwy_client_global.get("globalOnLoadEnd")?.();
    }
  }
}

// Take in a custom stringifier for the body
// Allow turning head idiomorph on / off (not sure yet which should be default)
// Build in Ky? Build in devalue?
// Make this take generics
// Allow "boost=`false`" on any form or link

async function submit({
  to,
  data,
  method = "POST",
}: {
  to: string;
  data: any;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
}) {
  hwy_client_global.get("globalOnLoadStart")?.();

  const abort_controller_key = to + method;
  const { abort_controller, did_abort } =
    handle_abort_controller(abort_controller_key);

  const is_form_data = data instanceof FormData;

  const url = new URL(to, window.location.origin);
  url.searchParams.set(`${HWY_PREFIX}json`, "1");

  try {
    const res = await fetch(url, {
      signal: abort_controller.signal,
      method: method,
      body: is_form_data ? data : JSON.stringify(data),
    });

    if (res.redirected) {
      if (!is_internal_link(res.url)) {
        window.location.href = res.url;
        return;
      }
      await navigate({
        href: res.url,
        navigationType: "redirect",
      });
      return;
    }

    const json = await res.json();

    abort_controllers.delete(abort_controller_key);

    if (did_abort) {
      // revalidate
      await navigate({
        href: location.href,
        navigationType: "revalidation",
      }); // this shuts off loading indicator too
    } else {
      hwy_client_global.set("actionData", json.actionData);

      // stop loading indicator
      hwy_client_global.get("globalOnLoadEnd")?.();
    }

    return json.actionData.find(Boolean);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // eat
    } else {
      console.error(error);
      hwy_client_global.get("globalOnLoadEnd")?.();
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
    if (i === hwy_client_global.get("fallbackIndex")) {
      updated_list.push({
        importPath: new_list[i],
        type: "new",
      });
    } else if (
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

  hwy_client_global.set(
    "activeErrorBoundaries",
    hwy_client_global.get("activeComponents").map((x: any) => x.ErrorBoundary),
  );

  const identical_keys_to_set = [
    "activeData",
    "activePaths",
    "outermostErrorBoundaryIndex",
    "errorToRender",
    "splatSegments",
    "params",
  ] as const satisfies ReadonlyArray<(typeof CLIENT_SIGNAL_KEYS)[number]>;

  for (const key of identical_keys_to_set) {
    hwy_client_global.set(key, json[key]);
  }

  if (navigationType !== "revalidation") {
    hwy_client_global.set("actionData", json.actionData);
  }

  document.title = json.title;
  removeAllBetween("meta");
  addBlocksToHead("meta", json.metaHeadBlocks);
  removeAllBetween("rest");
  addBlocksToHead("rest", json.restHeadBlocks);
}

export { initPreactClient, submit };

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
  if (!startElement || !endElement) return;

  let currentElement = startElement.nextSibling as HTMLElement | null;

  while (currentElement && currentElement !== endElement) {
    const nextElement = currentElement.nextSibling;
    currentElement.remove();
    currentElement = nextElement as HTMLElement | null;
  }
}

function addBlocksToHead(type: "meta" | "rest", blocks: Array<any>) {
  const { startElement, endElement } = getStartAndEndElements(type);
  if (!startElement || !endElement) return;

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

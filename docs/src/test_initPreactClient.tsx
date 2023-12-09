import { RootOutlet, get_hwy_client_global, client_signal_keys } from "hwy";
import { hydrate } from "preact";
import { morph } from "./Idiomorph-fork.js";
import { signal } from "@preact/signals";

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

async function initPreactClient(props?: {
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}) {
  for (const key of client_signal_keys) {
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

  hwy_client_global.set(
    "activeComponents",
    awaited_components.map((x) => x.default),
  );

  hwy_client_global.set(
    "activeErrorBoundaries",
    awaited_components.map((x) => x.ErrorBoundary),
  );

  hydrate(
    <RootOutlet />,
    document.getElementById("root-outlet-wrapper") as HTMLElement,
  );

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
      await navigate(anchor.href, true);
    }
  });

  window.addEventListener("popstate", async function () {
    await navigate(location.href, false);
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

    const data = Object.fromEntries(formData.entries());

    await submit({
      to: action,
      data,
      method: method as any,
    });
  });
}

async function navigate(href: string, setHistory: boolean) {
  hwy_client_global.get("globalOnLoadStart")?.();

  const abort_controller_key = href === "." ? "revalidate" : "navigate";
  const { abort_controller } = handle_abort_controller(abort_controller_key);

  try {
    // Create a URL object from the href
    const url = new URL(href, window.location.origin);

    const res = await fetch(url.toString(), {
      signal: abort_controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const json = await res.json();

    abort_controllers.delete(abort_controller_key);

    await reRenderApp(href, setHistory, json);

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

  try {
    const res = await fetch(to, {
      signal: abort_controller.signal,
      method: method,
      headers: {
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    abort_controllers.delete(abort_controller_key);

    // TODO -- handle redirects here

    if (did_abort) {
      // revalidate
      await navigate(location.href, false); // this shuts off loading indicator too
    } else {
      // stop loading indicator
      hwy_client_global.get("globalOnLoadEnd")?.();
    }

    await reRenderAppAfterPost(json); // just sets actionData

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

async function reRenderApp(href: string, setHistory: boolean, json: any) {
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
    // "actionData",
  ] as const satisfies ReadonlyArray<(typeof client_signal_keys)[number]>;

  for (const key of identical_keys_to_set) {
    hwy_client_global.set(key, json[key]);
  }

  // This sets the title faster than idiomorph can, since we know it now
  document.title = json.newTitle;

  if (setHistory) {
    if (href !== location.href) {
      history.pushState({}, "", href);
    } else {
      history.replaceState({}, "", href);
    }
  }

  const head_el = document.querySelector("head") as HTMLElement;
  morph(head_el, json.head);
}

async function reRenderAppAfterPost(json: any) {
  hwy_client_global.set("actionData", json.actionData);
}

export { initPreactClient, submit };

import { RootOutlet, get_hwy_client_global, client_signal_keys } from "hwy";
import { hydrate } from "preact";
import { morph } from "./Idiomorph-fork.js";
import { signal } from "@preact/signals";

let abortController = new AbortController();

const hwy_client_global = get_hwy_client_global();

async function initPreactClient(props?: {
  onLoadStart?: () => void;
  onLoadDone?: () => void;
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
    if (anchor) {
      event.preventDefault();
      const IS_HWY_LOADER_CALL = anchor.target !== "_blank"; // this isn't right  but ok for now
      if (IS_HWY_LOADER_CALL) {
        await navigate(
          anchor.href,
          true,
          props?.onLoadStart,
          props?.onLoadDone,
        );
      }
    }
  });

  window.addEventListener("popstate", async function (event) {
    await navigate(
      location.href,
      false,
      (window as any).NProgress.start,
      (window as any).NProgress.done,
    );
  });

  async function navigate(
    href: string,
    setHistory: boolean,
    onLoadStart?: () => void,
    onLoadEnd?: () => void,
  ) {
    onLoadStart?.();

    abortController.abort();
    abortController = new AbortController();

    try {
      const res = await fetch(href + "?__HWY__LOADER_FETCH__=1", {
        signal: abortController.signal,
      }); // this isn't right either
      const json = await res.json();

      await reRenderApp(href, setHistory, json);

      onLoadEnd?.();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // eat
      } else {
        console.error(error);
        onLoadEnd?.();
      }
    }
  }
}

async function postToAction(
  href: string,
  onLoadStart?: () => void,
  onLoadEnd?: () => void,
) {
  onLoadStart?.();

  abortController.abort();
  abortController = new AbortController();

  try {
    const res = await fetch(href + "?__HWY__LOADER_FETCH__=1", {
      signal: abortController.signal,
      method: "POST",
    }); // this isn't right either
    const json = await res.json();

    await reRenderAppAfterPost(json);

    onLoadEnd?.();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // eat
    } else {
      console.error(error);
      onLoadEnd?.();
    }
  }
}

async function reRenderApp(href: string, setHistory: boolean, json: any) {
  const old_list = hwy_client_global.get("activePaths");
  const new_list = json.activePaths;

  const updated_list: {
    importPath: string;
    type: "new" | "same";
  }[] = [];

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

  const components = updated_list.map((x: any, i) => {
    if (x.type === "new") {
      return import(("." + x.importPath).replace("public/dist/", ""));
    }
    return undefined;
  });

  const awaited_components = await Promise.all(components);

  const awaited_defaults = awaited_components.map((x) =>
    x ? x.default : undefined,
  );

  for (let i = 0; i < awaited_defaults.length; i++) {
    if (awaited_defaults[i]) {
      hwy_client_global.get("activeComponents")[i] = awaited_defaults[i];
    }
  }

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
    "actionData",
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

export { initPreactClient, postToAction };

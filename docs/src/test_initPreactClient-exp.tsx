import { RootOutlet } from "hwy";
import { hydrate, render } from "preact";
import { morph } from "./Idiomorph-fork.js";
import { signal } from "@preact/signals";

let abortController = new AbortController();

async function initPreactClient(props?: {
  onLoadStart?: () => void;
  onLoadDone?: () => void;
}) {
  const keys = [
    "active_data",
    "active_paths",
    "outermost_error_boundary_index",
    "error_to_render",
    "splat_segments",
    "params",
    "action_data",
    "active_components",
    "active_error_boundaries",
  ] as const;

  console.log(JSON.stringify((globalThis as any).__hwy__, null, 2));

  for (const key of keys) {
    (globalThis as any).__hwy__[key] = signal((globalThis as any).__hwy__[key]);

    console.log(key, ":", (globalThis as any).__hwy__[key].value);
  }

  const components = (globalThis as any).__hwy__.active_paths.value.map(
    (x: any) => {
      return import(("." + x).replace("public/dist/", ""));
    },
  );
  const awaited_components = await Promise.all(components);
  console.log("awaited_components", awaited_components);
  (globalThis as any).__hwy__.active_components.value = awaited_components.map(
    (x) => x.default,
  );
  console.log("asdoih", (globalThis as any).__hwy__.active_components.value);
  (globalThis as any).__hwy__.active_error_boundaries.value =
    awaited_components.map((x) => x.ErrorBoundary);

  render(
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
  (globalThis as any).__hwy__.active_data.value = json.activeData;
  (globalThis as any).__hwy__.active_paths.value = json.activePaths;
  (globalThis as any).__hwy__.outermost_error_boundary_index.value =
    json.outermostErrorBoundaryIndex;
  (globalThis as any).__hwy__.error_to_render.value = json.errorToRender;
  (globalThis as any).__hwy__.splat_segments.value = json.splatSegments;
  (globalThis as any).__hwy__.params.value = json.params;
  (globalThis as any).__hwy__.action_data.value = json.actionData;
  (globalThis as any).__hwy__.active_components.value = json.activeComponents;
  (globalThis as any).__hwy__.active_error_boundaries.value =
    json.activeErrorBoundaries;
  const components = (globalThis as any).__hwy__.active_paths.value.map(
    (x: any) => {
      return import(("." + x).replace("public/dist/", ""));
    },
  );
  const awaited_components = await Promise.all(components);
  (globalThis as any).__hwy__.active_components.value = awaited_components.map(
    (x) => x.default,
  );
  (globalThis as any).__hwy__.active_error_boundaries.value =
    awaited_components.map((x) => x.ErrorBoundary);

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
  (globalThis as any).__hwy__.action_data.value = json.actionData;
}

export { initPreactClient, postToAction };

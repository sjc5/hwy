import { RootOutlet } from "hwy";
import { hydrate, render } from "preact";
import { signal } from "@preact/signals";
import { morph } from "./Idiomorph-fork.js";

let abortController = new AbortController();

(globalThis as any).clientActivePathDataPayloadSignal = signal({} as any);

async function initPreactClient(props?: {
  onLoadStart?: () => void;
  onLoadDone?: () => void;
}) {
  const activeData = (globalThis as any).__hwy__.active_data;
  const activePaths = (globalThis as any).__hwy__.active_paths;
  const outermostErrorBoundaryIndex = (globalThis as any).__hwy__
    .outermostErrorBoundaryIndex;
  const errorToRender = (globalThis as any).__hwy__.error_to_render;
  const splatSegments = (globalThis as any).__hwy__.splat_segments;
  const params = (globalThis as any).__hwy__.params;
  const actionData = (globalThis as any).__hwy__.action_data;

  const components = activePaths.map((x: any) => {
    return import(("." + x).replace("public/dist/", ""));
  });
  const awaited_components = await Promise.all(components);
  const activeComponents = awaited_components.map((x) => x.default);
  const activeErrorBoundaries = awaited_components.map((x) => x.ErrorBoundary);

  const clientActivePathDataPayload = {
    activeData,
    activeComponents,
    activeErrorBoundaries,
    outermostErrorBoundaryIndex,
    errorToRender,
    splatSegments,
    params,
    actionData,
  } as any;

  (globalThis as any).clientActivePathDataPayloadSignal = signal(
    clientActivePathDataPayload,
  );

  hydrate(
    RootOutlet({
      activePathData: (globalThis as any).clientActivePathDataPayloadSignal
        .value,
    }),
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
  const components = json.activePaths.map((x: any) => {
    // replaced because the request is already coming from "public/dist"
    return import(("." + x).replace("public/dist/", ""));
  });
  const awaited_components = await Promise.all(components);
  const activeComponents = awaited_components.map((x) => x.default);
  const activeErrorBoundaries = awaited_components.map((x) => x.ErrorBoundary);

  document.title = json.newTitle;

  (globalThis as any).clientActivePathDataPayloadSignal.value = {
    activeData: { ...json.activeData },
    activeComponents: { ...activeComponents },
    activeErrorBoundaries: { ...activeErrorBoundaries },
    outermostErrorBoundaryIndex: json.outermostErrorBoundaryIndex,
    errorToRender: json.errorToRender,
    splatSegments: [...json.splatSegments],
    params: { ...json.params },
    actionData: json.actionData,
  };

  if (setHistory) {
    if (href !== location.href) {
      history.pushState({}, "", href);
    } else {
      history.replaceState({}, "", href);
    }
  }

  render(
    RootOutlet({
      activePathData: (globalThis as any).clientActivePathDataPayloadSignal
        .value,
    }),
    document.getElementById("root-outlet-wrapper") as HTMLElement,
  );

  const head_el = document.querySelector("head") as HTMLElement;
  morph(head_el, json.head);
}

async function reRenderAppAfterPost(json: any) {
  (globalThis as any).clientActivePathDataPayloadSignal.value = {
    ...(globalThis as any).clientActivePathDataPayloadSignal.value,
    actionData: json.actionData,
  };

  render(
    RootOutlet({
      activePathData: (globalThis as any).clientActivePathDataPayloadSignal
        .value,
    }),
    document.getElementById("root-outlet-wrapper") as HTMLElement,
  );
}

export { initPreactClient, postToAction };

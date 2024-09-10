import { HWY_PREFIX_JSON, ScrollState } from "../../common/index.mjs";
import {
  abortControllers,
  handleAbortController,
} from "./abort_controllers.js";
import { handleRedirects } from "./handle_redirects.js";
import { reRenderApp } from "./render.js";
import { setStatus } from "./status.js";

export type NavigationType =
  | "browserHistory"
  | "userNavigation"
  | "revalidation"
  | "redirect";

export async function internalNavigate(props: {
  href: string;
  navigationType: NavigationType;
  scrollStateToRestore?: ScrollState;
  replace?: boolean;
}) {
  setStatus({ type: props.navigationType, value: true });

  const abortControllerKey =
    props.href === "." || props.href === window.location.href
      ? "revalidate"
      : "navigate";
  const { abortController } = handleAbortController(abortControllerKey);

  try {
    const url = new URL(props.href, window.location.origin);
    url.searchParams.set(HWY_PREFIX_JSON, "1");

    const { response } = await handleRedirects({
      abortController,
      url,
    });

    abortControllers.delete(abortControllerKey);

    if (!response || (!response.ok && response.status !== 304)) {
      setStatus({ type: props.navigationType, value: false });
      return;
    }

    const json = await response?.json();

    if (!json) {
      throw new Error("No JSON response");
    }

    await reRenderApp({
      json,
      navigationType: props.navigationType,
      runHistoryOptions: props,
    });

    setStatus({ type: props.navigationType, value: false });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // eat
    } else {
      console.error(error);
      setStatus({ type: props.navigationType, value: false });
    }
  }
}

export async function revalidate() {
  await internalNavigate({
    href: window.location.href,
    navigationType: "revalidation",
  });
}

export async function navigate(href: string, options?: { replace?: boolean }) {
  await internalNavigate({
    href,
    navigationType: "userNavigation",
    replace: options?.replace,
  });
}

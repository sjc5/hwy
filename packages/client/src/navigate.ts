import { HWY_PREFIX_JSON, getHwyClientGlobal } from "../../common/index.mjs";
import {
  abortControllers,
  handleAbortController,
} from "./abort_controllers.js";
import { customHistory } from "./custom_history.js";
import { handleRedirects } from "./handle_redirects.js";
import { reRenderApp } from "./render.js";
import { setStatus } from "./status.js";

export type NavigationType =
  | "browserHistory"
  | "userNavigation"
  | "revalidation"
  | "redirect";

const hwyClientGlobal = getHwyClientGlobal();

export async function internalNavigate(props: {
  href: string;
  navigationType: NavigationType;
  scrollStateToRestore?: { x: number; y: number };
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

    const res = await handleRedirects({
      abortController,
      url,
    });

    abortControllers.delete(abortControllerKey);

    if (!res || res.status !== 200) {
      setStatus({ type: props.navigationType, value: false });
      return;
    }

    const json = await res?.json();

    if (!json) {
      throw new Error("No JSON response");
    }

    // HARD RELOAD IF BUILD ID CHANGED
    if (json.buildID !== hwyClientGlobal.get("buildID")) {
      window.location.href = props.href;
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
    href: location.href,
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

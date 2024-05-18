import { getIsGETRequest, getIsInternalLink } from "./helpers.js";
import { internalNavigate } from "./navigate.js";

export async function handleRedirects(props: {
  abortController: AbortController;
  url: URL;
  requestInit?: RequestInit;
}) {
  let res: any;
  let bodyParentObj: RequestInit = {};

  if (
    props.requestInit &&
    (props.requestInit.body !== undefined ||
      !getIsGETRequest(props.requestInit))
  ) {
    if (
      props.requestInit.body instanceof FormData ||
      typeof props.requestInit.body === "string"
    ) {
      bodyParentObj.body = props.requestInit.body;
    } else {
      bodyParentObj.body = JSON.stringify(props.requestInit.body);
    }
  }

  try {
    res = await fetch(props.url, {
      signal: props.abortController.signal,
      ...props.requestInit,
      ...bodyParentObj,
    });

    if (res?.redirected) {
      const newURL = new URL(res.url);

      if (!getIsInternalLink(newURL.href)) {
        // external link, hard redirecting
        window.location.href = newURL.href;
        return;
      }

      // internal link, soft redirecting
      await internalNavigate({
        href: newURL.href,
        navigationType: "redirect",
      });

      return;
    }
  } catch (err) {
    // If this was an attempted redirect,
    // potentially a CORS error here
    // Recommend returning a JSON instruction to redirect on client
    // with window.location.href = newURL.href;
    console.error(err);
  }

  return res;
}

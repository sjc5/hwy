import { getShouldPreventLinkDefault } from "./helpers.js";
import { internalNavigate } from "./navigate.js";
import { submit } from "./submit.js";

export function addDataBoostListeners() {
  addAnchorClickListenener();
  addFormSubmitListener();
}

function addAnchorClickListenener() {
  document.body.addEventListener("click", async function (event) {
    const anchor = (event.target as HTMLElement).closest("a");

    if (!anchor || !anchor.dataset.boost || event.defaultPrevented) {
      return;
    }

    if (getShouldPreventLinkDefault(event)) {
      event.preventDefault();
      await internalNavigate({
        href: anchor.href,
        navigationType: "userNavigation",
      });
    }
  });
}

function addFormSubmitListener() {
  window.addEventListener("submit", async function (event) {
    const form = event.target as HTMLFormElement;

    if (!form.dataset.boost || event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    const requestInit: RequestInit = { method: form.method };
    if (form.method.toLowerCase() !== "get") {
      requestInit.body = new FormData(form);
    }
    await submit(form.action || window.location.href, requestInit);
  });
}

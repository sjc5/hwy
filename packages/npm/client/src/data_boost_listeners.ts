import { getShouldPreventLinkDefault } from "./helpers.js";
import { internalNavigate } from "./navigate.js";

export function addAnchorClickListenener() {
	document.body.addEventListener("click", async (event) => {
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

import { initClient } from "@hwy-js/client";
import { HwyRootOutlet } from "@hwy-js/lit";
import { html, render } from "lit";
import { Sidebar } from "./components/sidebar";

await initClient(() => {
  render(
    html`
      ${Sidebar({})}
      <main>
        ${HwyRootOutlet({
          fallbackErrorBoundary: () => html`<div>Error Boundary in Root</div>`,
        })}
      </main>
    `,
    document.getElementById("root") as HTMLElement,
  );
});

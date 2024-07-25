import { initClient } from "@hwy-js/client";
import { HwyRootLayout, HwyRootOutlet, makeComp } from "@hwy-js/lit";
import { html, render } from "lit";
import { Sidebar } from "./components/sidebar";

class LayoutDef extends HwyRootLayout {
  render() {
    return html`
      ${Sidebar({})}
      <main>${this.Outlet({ test: "hi jeff" })}</main>
    `;
  }
}

const Layout = makeComp(LayoutDef, "layout");

const App = HwyRootOutlet({
  layout: Layout,
  fallbackErrorBoundary: () => html`<div>Error Boundary in Root</div>`,
});

await initClient(() => {
  render(App, document.getElementById("root") as HTMLElement);
});

import { initPreactClient } from "@hwy-js/client";
import { RootOutlet } from "hwy";

await initPreactClient({
  elementToHydrate: document.querySelector("main") as HTMLElement,
  hydrateWith: (
    <RootOutlet
      fallbackErrorBoundary={function ErrorBoundary() {
        return <div>Error Boundary in Root</div>;
      }}
    />
  ),
});

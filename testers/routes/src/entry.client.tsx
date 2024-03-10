import { initPreactClient, RootOutletClient } from "@hwy-js/client";

await initPreactClient({
  elementToHydrate: document.querySelector("main") as HTMLElement,
  hydrateWith: (
    <RootOutletClient
      fallbackErrorBoundary={function ErrorBoundary() {
        return <div>Error Boundary in Root</div>;
      }}
    />
  ),
});

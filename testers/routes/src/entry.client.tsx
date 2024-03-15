import { initReactClient, RootOutletClient } from "@hwy-js/client";

await initReactClient({
  elementToHydrate: document.querySelector("main") as HTMLElement,
  hydrateWith: (
    <RootOutletClient
      fallbackErrorBoundary={function ErrorBoundary() {
        return <div>Error Boundary in Root</div>;
      }}
    />
  ),
});

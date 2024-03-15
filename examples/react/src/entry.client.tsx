import { RootOutletClient, initReactClient } from "@hwy-js/client";

await initReactClient({
  hydrateWith: (
    <RootOutletClient
      fallbackErrorBoundary={() => {
        return <div>Something went wrong.</div>;
      }}
    />
  ),
  elementToHydrate: document.querySelector("main") as HTMLElement,
});

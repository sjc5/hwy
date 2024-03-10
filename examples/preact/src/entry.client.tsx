import { RootOutletClient, initPreactClient } from "@hwy-js/client";

await initPreactClient({
  hydrateWith: (
    <RootOutletClient
      fallbackErrorBoundary={() => {
        return <div>Something went wrong.</div>;
      }}
    />
  ),
  elementToHydrate: document.querySelector("main") as HTMLElement,
});

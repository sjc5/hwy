import { RootOutlet, initPreactClient } from "@hwy-js/client";

await initPreactClient({
  hydrateWith: (
    <RootOutlet
      fallbackErrorBoundary={() => {
        return <div>Something went wrong.</div>;
      }}
    />
  ),
  elementToHydrate: document.querySelector("main") as HTMLElement,
});

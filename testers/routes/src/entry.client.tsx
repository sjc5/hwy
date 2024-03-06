import { initPreactClient, RootOutlet } from "@hwy-js/client";

console.log("JAKE");

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

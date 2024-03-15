import { RootOutletClient, initReactClient } from "@hwy-js/client";

await initReactClient({
  elementToHydrate: document.getElementById("root-outlet-wrapper")!,
  hydrateWith: <RootOutletClient />,
});

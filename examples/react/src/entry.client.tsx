import { initReactClient, RootOutletClient } from "@hwy-js/client";
import React from "react";
import { hydrateRoot } from "react-dom/client";

await initReactClient(() => {
  hydrateRoot(
    document.querySelector("main") as HTMLElement,
    <React.StrictMode>
      <RootOutletClient
        fallbackErrorBoundary={function ErrorBoundary() {
          return <div>Something went wrong.</div>;
        }}
      />
    </React.StrictMode>,
  );
});

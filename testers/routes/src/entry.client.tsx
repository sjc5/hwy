import { initClient } from "@hwy-js/client";
import { RootOutlet } from "hwy";
import React, { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

await initClient(() => {
  startTransition(() => {
    hydrateRoot(
      document.querySelector("main") as HTMLElement,
      <React.StrictMode>
        <RootOutlet
          fallbackErrorBoundary={function ErrorBoundary() {
            return <div>Error Boundary in Root</div>;
          }}
        />
      </React.StrictMode>,
    );
  });
});

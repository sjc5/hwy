import { initClient } from "@hwy-js/client";
import { RootOutlet } from "@hwy-js/react";
import React, { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

await initClient(() => {
  startTransition(() => {
    hydrateRoot(
      document.querySelector("main") as HTMLElement,
      <React.StrictMode>
        <RootOutlet
          fallbackErrorBoundary={function ErrorBoundary() {
            return <div>Something went wrong.</div>;
          }}
        />
      </React.StrictMode>,
    );
  });
});

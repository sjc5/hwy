import { initClient } from "@hwy-js/client";
import { ClientRootOutlet } from "@hwy-js/client/react";
import { RootOutlet } from "hwy";
import React from "react";
import { hydrateRoot } from "react-dom/client";

await initClient(() => {
  hydrateRoot(
    document.querySelector("main") as HTMLElement,
    <React.StrictMode>
      <ClientRootOutlet
        fallbackErrorBoundary={function ErrorBoundary() {
          return <div>Something went wrong.</div>;
        }}
      />
    </React.StrictMode>,
  );
});

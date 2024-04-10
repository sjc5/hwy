import { initClient } from "@hwy-js/client";
import { RootOutlet } from "@hwy-js/react";
import React, { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { RootLayout } from "./pages/layout.js";

await initClient(() => {
  startTransition(() => {
    hydrateRoot(
      document.getElementById("root") as HTMLElement,
      <React.StrictMode>
        <RootOutlet
          fallbackErrorBoundary={() => <div>Something went wrong.</div>}
          layout={RootLayout}
        />
      </React.StrictMode>,
    );
  });
});

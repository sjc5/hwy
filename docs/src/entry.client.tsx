import { initClient } from "@hwy-js/client";
import { RootOutlet } from "hwy";
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { RootLayout } from "./pages/layout.js";

await initClient(() => {
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

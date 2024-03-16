import { initReactClient } from "@hwy-js/client";
import { RootOutlet } from "hwy";
import React from "react";
import { hydrateRoot } from "react-dom/client";

await initReactClient(() => {
  hydrateRoot(
    document.getElementById("root-outlet-wrapper") as HTMLElement,
    <React.StrictMode>
      <RootOutlet />
    </React.StrictMode>,
  );
});

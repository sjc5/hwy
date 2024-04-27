import { addStatusListener, initClient } from "@hwy-js/client";
import { RootOutlet } from "@hwy-js/react";
import React, { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

await initClient(() => {
  console.log("Client initialized");
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

import NProgress from "nprogress";

addStatusListener(function (evt) {
  if (evt.detail.isNavigating && !NProgress.isStarted()) {
    NProgress.start();
  } else {
    NProgress.done();
  }
});

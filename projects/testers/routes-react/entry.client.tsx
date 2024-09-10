// IF PREACT
declare global {
  var process: { env: { NODE_ENV: string } };
}
if (process.env.NODE_ENV === "development") {
  await import("preact/debug");
}

import { initClient } from "@hwy-js/client";
import { HwyRootOutlet } from "@hwy-js/react";
import { Sidebar } from "./components/sidebar";

// IF REACT
// import React from "react";
// import { createRoot } from "react-dom/client";

// IF PREACT
import { render } from "preact";
import { StrictMode } from "preact/compat";

await initClient(() => {
  const rootEl = document.getElementById("root") as HTMLElement;

  // IF REACT
  // const root = createRoot(rootEl);
  // root.render(
  //   <React.StrictMode>
  //     <Sidebar />
  //     <main>
  //       <HwyRootOutlet
  //         fallbackErrorBoundary={function ErrorBoundary() {
  //           return <div>Error Boundary in Root</div>;
  //         }}
  //       />
  //     </main>
  //   </React.StrictMode>,
  // );

  // IF PREACT
  render(
    <StrictMode>
      <Sidebar />
      <main>
        <HwyRootOutlet
          fallbackErrorBoundary={function ErrorBoundary() {
            return <div>Error Boundary in Root</div>;
          }}
        />
      </main>
    </StrictMode>,
    rootEl,
  );
});

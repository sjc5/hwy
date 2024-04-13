if (process.env.NODE_ENV === "development") {
  await import("preact/debug");
}
import { initClient } from "@hwy-js/client";
import { RootOutlet } from "@hwy-js/react";
import { StrictMode, hydrate, startTransition } from "preact/compat";

await initClient(() => {
  startTransition(() => {
    hydrate(
      <StrictMode>
        <RootOutlet
          fallbackErrorBoundary={function ErrorBoundary() {
            return <div>Something went wrong.</div>;
          }}
        />
      </StrictMode>,
      document.querySelector("main") as HTMLElement,
    );
  });
});

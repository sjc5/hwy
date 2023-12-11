import { type BaseProps, RootOutlet } from "@hwy-js/client";
import { Nav } from "./nav.js";
import { FallbackErrorBoundary } from "./fallback-error-boundary.js";

function BodyInner(baseProps: BaseProps | {}) {
  return (
    <div class="body-inner">
      <div style={{ flexGrow: 1 }}>
        <Nav />

        <div class="root-outlet-wrapper" id={"root-outlet-wrapper"}>
          <RootOutlet
            {...baseProps}
            fallbackErrorBoundary={FallbackErrorBoundary}
          />
        </div>
      </div>

      <footer>
        <span style={{ opacity: 0.6 }}>
          MIT License. Copyright (c) 2023 Samuel J. Cook.
        </span>
      </footer>
    </div>
  );
}

export { BodyInner };

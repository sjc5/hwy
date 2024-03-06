import { RootOutlet, RouteData } from "@hwy-js/client";
import { Nav } from "./nav.js";

function BodyInner({ routeData }: { routeData?: RouteData }) {
  return (
    <div class="body-inner">
      <div style={{ flexGrow: 1 }}>
        <Nav />

        <div class="root-outlet-wrapper">
          <RootOutlet {...routeData} />
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

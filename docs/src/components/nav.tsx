import { Boldtalic } from "./bold-italic.js";

function Nav() {
  return (
    <nav>
      <a class="logo" href="/">
        <h1>
          Hwy{" "}
          <span style={{ fontSize: "1rem" }}>
            (<Boldtalic>BETA</Boldtalic>)
          </span>
        </h1>
      </a>

      <div style={{ display: "flex" }}>
        <a href="/docs" class="nav-item" title="Hwy Documentation">
          Docs
        </a>

        <a
          href="https://github.com/hwy-js/hwy"
          target="_blank"
          title="Star on GitHub"
          class="nav-item"
        >
          ⭐ GitHub
        </a>
      </div>
    </nav>
  );
}

export { Nav };

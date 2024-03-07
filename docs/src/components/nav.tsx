function Nav() {
  return (
    <nav>
      <a class="logo" href="/" data-boost="true">
        <h1>Hwy</h1>
      </a>

      <div style={{ display: "flex" }}>
        <a
          href="/docs"
          class="nav-item"
          title="Hwy Documentation"
          data-boost="true"
        >
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

function Nav() {
  return (
    <nav>
      <a className="logo" href="/" data-boost="true">
        <h1>Hwy</h1>
      </a>

      <div style={{ display: "flex" }}>
        <a
          href="/docs"
          className="nav-item"
          title="Hwy Documentation"
          data-boost="true"
        >
          Docs
        </a>

        <a
          href="https://github.com/hwy-js/hwy"
          target="_blank"
          title="Star on GitHub"
          className="nav-item"
        >
          ⭐ GitHub
        </a>
      </div>
    </nav>
  );
}

export { Nav };

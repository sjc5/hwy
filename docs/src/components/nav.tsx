function Nav() {
  return (
    <nav class="flex-wrap mt-6 mb-12 items-center flex justify-between">
      <a
        href="/"
        class="hover:text-orange-700 hover:dark:text-orange-300 font-bold text-2xl mr-2 h-[33px] flex items-center leading-none"
      >
        <h1>Hwy</h1>
      </a>

      <div class="flex">
        <a
          href="/docs"
          class="px-2 rounded hover:bg-blue-500 hover:text-white uppercase h-[33px] flex items-center leading-none font-bold"
          title="Hwy Documentation"
        >
          Docs
        </a>

        <a
          href="https://github.com/hwy-js/hwy"
          target="_blank"
          class="px-2 rounded hover:bg-blue-500 hover:text-white uppercase h-[33px] flex items-center leading-none font-bold"
          title="Star on GitHub"
        >
          ⭐ GitHub
        </a>
      </div>
    </nav>
  );
}

export { Nav };

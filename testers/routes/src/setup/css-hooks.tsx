import { buildHooksSystem, recommended } from "@css-hooks/core";

const createHooks = buildHooksSystem();

const [css, hooks] = createHooks({
  ...recommended,
  dark: "@media (prefers-color-scheme: dark)",
});

function CssHooksStyleSheet() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export { hooks, CssHooksStyleSheet };

const css_hooks_code =
  `
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
`.trim() + "\n";

function get_css_hooks_setup() {
  return css_hooks_code;
}

export { get_css_hooks_setup };

import type { Options } from "./types.js";
import { get_is_target_deno } from "./utils.js";

function get_client_entry(options: Options) {
  const is_targeting_deno = get_is_target_deno(options);

  return (
    `
${
  is_targeting_deno
    ? "// deno-lint-ignore-file\n"
    : options.deployment_target === "bun" &&
      options.lang_preference === "typescript"
    ? `/// <reference lib="dom" />\n`
    : ""
}
const __window = window as any;

import htmx from "htmx.org";
__window.htmx = htmx;
${
  options.with_nprogress
    ? `
import NProgress from "nprogress";
__window.NProgress = NProgress;
`
    : ``
}
${
  options.lang_preference === "typescript" && !is_targeting_deno
    ? `// @ts-ignore`
    : ``
}
import("htmx.org/dist/ext/head-support.js");
`.trim() + "\n"
  );
}

export { get_client_entry };

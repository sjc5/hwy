import type { Options } from "../index.js";

const base_version =
  `
import { initHtmx, initIdiomorph } from "@hwy-js/client";

initHtmx().then(initIdiomorph);
`.trim() + "\n";

const with_nprogress_version =
  `
import { initHtmx, initIdiomorph, initNProgress } from "@hwy-js/client";

initHtmx().then(initIdiomorph).then(initNProgress);
`.trim() + "\n";

function get_client_entry(options: Options) {
  if (options.with_nprogress) {
    return with_nprogress_version;
  }

  return base_version;
}

export { get_client_entry };

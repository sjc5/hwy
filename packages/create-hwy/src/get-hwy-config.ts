import { DEFAULT_PORT, HwyConfig } from "../../common/index.mjs";
import { Options } from "../index.js";

// Perhaps modes should be "MPA", "ENHANCED-MPA", and "SPA"?

function get_hwy_config(options: Options) {
  let obj: HwyConfig =
    options.client_lib === "preact"
      ? {
          mode: "preact-mpa",
          deploymentTarget: options.deployment_target,
          useDotServerFiles: true,
        }
      : {
          mode: "htmx-mpa",
          deploymentTarget: options.deployment_target,
          useDotServerFiles: false,
        };

  if (options.deployment_target !== "cloudflare-pages") {
    obj.dev = {
      port: DEFAULT_PORT,
    };
  }

  if (options.css_preference === "tailwind") {
    obj.dev = {
      ...obj.dev,
      watchExclusions: ["src/styles/tw-input.css"],
    };
  }

  let text = `export default ${JSON.stringify(obj, null, 2)}`;

  text =
    `import type { HwyConfig } from "@hwy-js/build";\n\n` +
    text +
    ` satisfies HwyConfig;`;

  return text.trim() + "\n";
}

export { get_hwy_config };

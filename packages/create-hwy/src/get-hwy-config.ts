import { DEFAULT_PORT } from "../../common/index.mjs";
import type { Options } from "../index.js";

function get_hwy_config(options: Options) {
  let text = `export default {
    dev: {
      port: ${DEFAULT_PORT},${
        options.css_preference === "tailwind"
          ? '\n      watchExclusions: ["src/styles/tw-output.bundle.css"],'
          : ""
      }
    },
    deploymentTarget: "${options.deployment_target}",
  }`;

  if (options.lang_preference === "typescript") {
    text =
      `import type { HwyConfig } from "@hwy-js/build";\n\n` +
      text +
      ` satisfies HwyConfig;`;
  } else {
    text = `/** @type {import('@hwy-js/build').HwyConfig} */\n` + text + ";";
  }

  return text.trim() + "\n";
}

export { get_hwy_config };

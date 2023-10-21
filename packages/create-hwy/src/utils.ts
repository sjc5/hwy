import type { Options } from "../index.js";

function get_is_target_deno(options: Options) {
  return (
    options.deployment_target === "deno" ||
    options.deployment_target === "deno-deploy"
  );
}

export { get_is_target_deno };

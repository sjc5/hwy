import { Options } from "./types.js";

function target_is_deno(options: Options) {
  return (
    options.deployment_target === "deno" ||
    options.deployment_target === "deno_deploy"
  );
}

export { target_is_deno };

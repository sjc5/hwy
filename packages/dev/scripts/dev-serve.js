#!/usr/bin/env node

import { spawn } from "child_process";
import path from "path";

function set_env_and_run_command(env_var, env_value, command, args) {
  return new Promise((resolve, reject) => {
    const full_command_path = path.join(
      process.cwd(),
      "node_modules",
      ".bin",
      command
    );
    const env = { ...process.env, [env_var]: env_value };

    const proc = spawn(full_command_path, args, {
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    proc.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function run_dev_serve() {
  await set_env_and_run_command("NODE_ENV", "development", "hwy-build", []);
  await set_env_and_run_command("NODE_ENV", "development", "nodemon", [
    "--watch",
    ".dev/refresh.txt",
  ]);
}

run_dev_serve().catch((err) => {
  console.error(err);
  process.exit(1);
});

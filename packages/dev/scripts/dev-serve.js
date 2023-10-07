#!/usr/bin/env node

import { spawn } from "child_process";
import path from "path";
import chokidar from "chokidar";

function set_env_and_run_command(env_var, env_value, command, args) {
  return new Promise((resolve, reject) => {
    const full_command_path = path.join(
      process.cwd(),
      "node_modules",
      ".bin",
      command,
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

let current_proc = null; // variable to hold the reference to the current process

function run_command_with_spawn() {
  return new Promise((resolve, reject) => {
    if (current_proc) {
      current_proc.kill(); // Kill the previous process if it exists
    }

    const env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const proc = spawn("node", ["dist/main.js"], {
      env: env,
      stdio: "inherit",
    });

    // Set the current process to the newly spawned process
    current_proc = proc;

    proc.on("exit", (code) => {
      if (current_proc === proc) {
        current_proc = null;
      }

      if (code === null) {
        // Process was forcefully terminated
        return;
      }

      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve();
      }
    });

    proc.on("error", (error) => {
      if (current_proc === proc) {
        current_proc = null;
      }
      reject(error);
    });
  });
}

let timeout;

async function chokidar_watch() {
  const refresh_watcher = chokidar.watch(
    path.join(process.cwd(), ".dev/refresh.txt"),
    { ignoreInitial: true },
  );

  refresh_watcher.on("all", async () => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      run_command_with_spawn().catch((error) => {
        console.error(error);
      });
    }, 1);
  });
}

chokidar_watch();

async function run_dev_serve() {
  await set_env_and_run_command("NODE_ENV", "development", "hwy-build-dev", []);
}

await run_dev_serve().catch((err) => {
  console.error(err);
  process.exit(1);
});

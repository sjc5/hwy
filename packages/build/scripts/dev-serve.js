#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import chokidar from "chokidar";
import dotenv from "dotenv";
import fs from "node:fs";

const hwy_config_exists = fs.existsSync(path.join(process.cwd(), "hwy.json"));

const hwy_config = hwy_config_exists
  ? JSON.parse(fs.readFileSync(path.join(process.cwd(), "hwy.json"), "utf-8"))
  : {};

const PORT = hwy_config.dev?.port;

const WATCH_EXCLUSIONS = hwy_config.dev?.watchExclusions;

const SHOULD_START_DEV_SERVER = hwy_config.dev?.shouldStartServer;

console.log({ WATCH_EXCLUSIONS, PORT });

const CHOKIDAR_RPC_PATH = "/__hwy__chokidar_rpc";

let has_run_one_time = false;

const { runBuildTasks } = await import("../dist/index.js");

console.log("RUNNING IN DEVELOPMENT MODE");

dotenv.config();

const refresh_watcher = chokidar.watch(
  path.join(process.cwd(), ".dev/refresh.txt"),
  { ignoreInitial: true },
);

refresh_watcher.on("all", async () => {
  if (has_run_one_time) {
    try {
      await fetch(`http://localhost:${PORT}${CHOKIDAR_RPC_PATH}`);
    } catch {}
  }

  has_run_one_time = true;

  if (SHOULD_START_DEV_SERVER !== false) {
    run_command_with_spawn().catch((error) => {
      console.error(error);
    });
  }
});

const exclusions =
  WATCH_EXCLUSIONS?.map((x) => path.join(process.cwd(), x)) || [];

const watcher = chokidar.watch(
  [path.join(process.cwd(), "src"), path.join(process.cwd(), "public")],
  {
    ignoreInitial: true,
    ignored: [path.join(process.cwd(), "public/dist"), ...exclusions],
  },
);

watcher.on("all", async (_, path) => {
  console.log("Change detected, restarting server...");

  await runBuildTasks({
    isDev: true,
    log: "triggered from chokidar watcher: " + path,
  });
});

let current_proc = null; // variable to hold the reference to the current process

function run_command_with_spawn() {
  return new Promise((resolve, reject) => {
    if (current_proc) {
      current_proc.kill(); // Kill the previous process if it exists
    }

    const env = {
      ...process.env,
      NODE_ENV: "development",
      PORT,
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

async function run_dev_serve() {
  await set_env_and_run_command("NODE_ENV", "development", "hwy-build-dev", []);
}

await run_dev_serve().catch((err) => {
  console.error(err);
  process.exit(1);
});

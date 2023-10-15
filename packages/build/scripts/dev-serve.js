#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import chokidar from "chokidar";
import dotenv from "dotenv";
import fs from "node:fs";

const { runBuildTasks, hwyLog } = await import("../dist/index.js");

const hwy_config_exists = fs.existsSync(path.join(process.cwd(), "hwy.json"));

const hwy_config = hwy_config_exists
  ? JSON.parse(fs.readFileSync(path.join(process.cwd(), "hwy.json"), "utf-8"))
  : {};

const PORT = hwy_config.dev?.port;
const WATCH_EXCLUSIONS = hwy_config.dev?.watchExclusions;

const DEPLOYMENT_TARGET = hwy_config?.deploymentTarget;

const is_targeting_deno =
  DEPLOYMENT_TARGET === "deno" || DEPLOYMENT_TARGET === "deno-deploy";

const LIVE_REFRESH_RPC_PATH = "/__hwy__live_refresh_rpc";

let has_run_one_time = false;

hwyLog("Running in DEV mode.");

dotenv.config();

const refresh_watcher = chokidar.watch(
  path.join(process.cwd(), ".dev/refresh.txt"),
  { ignoreInitial: true },
);

refresh_watcher.on("all", async () => {
  if (has_run_one_time) {
    try {
      await fetch(`http://127.0.0.1:${PORT}${LIVE_REFRESH_RPC_PATH}`);
    } catch (e) {
      console.error("Live refresh RPC failed:", e);
    }
  }

  has_run_one_time = true;

  if (DEPLOYMENT_TARGET === "cloudflare-pages") {
    return;
  }

  if (is_targeting_deno) {
    run_command_with_spawn_deno().catch((error) => {
      console.error(error);
    });

    return;
  }

  run_command_with_spawn().catch((error) => {
    console.error(error);
  });
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
  hwyLog("Change detected, restarting server...");

  await runBuildTasks({
    isDev: true,
    log: "triggered from chokidar watcher: " + path,
  });
});

let current_proc = null; // variable to hold the reference to the current process

async function run_command_with_spawn() {
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

let current_proc_deno;

async function run_command_with_spawn_deno() {
  if (current_proc_deno) {
    try {
      current_proc_deno.kill();
    } catch {
      // eat
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 50));

  const env = {
    ...Deno.env.toObject(),
    NODE_ENV: "development",
    IS_DEV: "1",
    PORT: String(PORT),
  };

  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", "dist/main.js"],
    env,
    stdout: "inherit",
    stderr: "inherit",
  });

  current_proc_deno = cmd.spawn();
}

try {
  await runBuildTasks({ isDev: true, log: "triggered from dev-serve.js" });
} catch (e) {
  console.error("ERROR: Build tasks failed:", e);
}

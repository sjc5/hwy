import { ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import chokidar from "chokidar";
import dotenv from "dotenv";
import { runBuildTasks } from "./run-build-tasks.js";
import { hwyLog } from "./hwy-log.js";
import { LIVE_REFRESH_RPC_PATH } from "../../common/index.mjs";
import { get_hwy_config } from "./get-hwy-config.js";

declare const Deno: Record<any, any>;

const { deploymentTarget: deployment_target, dev: dev_config } =
  await get_hwy_config();

async function devServe() {
  const is_targeting_deno =
    deployment_target === "deno" || deployment_target === "deno-deploy";

  let has_run_one_time = false;

  hwyLog("Running in DEV mode.");

  dotenv.config();

  const refresh_watcher = chokidar.watch(
    path.join(process.cwd(), "dist", "refresh.txt"),
    { ignoreInitial: true },
  );

  refresh_watcher.on("all", async () => {
    if (has_run_one_time) {
      try {
        await fetch(
          `http://127.0.0.1:${dev_config?.port}${LIVE_REFRESH_RPC_PATH}`,
        );
      } catch (e) {
        console.error("Live refresh RPC failed:", e);
      }
    }

    has_run_one_time = true;

    if (deployment_target === "cloudflare-pages") {
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
    dev_config.watchExclusions?.map((x) => path.join(process.cwd(), x)) || [];

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

  let current_proc: ChildProcess | null = null;

  const base_env = { NODE_ENV: "development", PORT: String(dev_config.port) };

  async function run_command_with_spawn() {
    return new Promise<void>((resolve, reject) => {
      if (current_proc) {
        current_proc.kill();
      }

      const env = {
        ...process.env,
        ...base_env,
      };

      const proc = spawn("node", ["dist/main.js"], {
        env,
        stdio: "inherit",
      });

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

  let current_proc_deno: any;

  async function run_command_with_spawn_deno() {
    if (current_proc_deno) {
      try {
        current_proc_deno.kill();
      } catch {}
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    const env = {
      ...Deno.env.toObject(),
      ...base_env,
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
}

export { devServe };

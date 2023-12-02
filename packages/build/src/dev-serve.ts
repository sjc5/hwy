import { ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import chokidar from "chokidar";
import dotenv from "dotenv";
import { runBuildTasks } from "./run-build-tasks.js";
import { hwyLog } from "./hwy-log.js";
import {
  LIVE_REFRESH_RPC_PATH,
  type RefreshFilePayload,
} from "../../common/index.mjs";
import { get_hwy_config } from "./get-hwy-config.js";
import fs from "node:fs";

declare const Deno: Record<any, any>;

const { deploymentTarget: deployment_target, dev: dev_config } =
  await get_hwy_config();

async function devServe() {
  const is_targeting_deno =
    deployment_target === "deno" || deployment_target === "deno-deploy";

  let has_run_one_time = false;

  hwyLog("Running in DEV mode.");

  dotenv.config();

  if (deployment_target !== "cloudflare-pages") {
    const refresh_watcher = chokidar.watch(
      path.join(process.cwd(), "dist", "refresh.txt"),
      { ignoreInitial: true },
    );

    refresh_watcher.on("all", async () => {
      const refresh_txt_path = path.join(process.cwd(), "dist", "refresh.txt");

      const refresh_obj = JSON.parse(
        fs.readFileSync(refresh_txt_path, "utf8"),
      ) as RefreshFilePayload;

      if (has_run_one_time) {
        try {
          await fetch(
            `http://127.0.0.1:${dev_config?.port}${LIVE_REFRESH_RPC_PATH}?changeType=${refresh_obj.changeType}`,
          );
        } catch (e) {
          console.error("Live refresh RPC failed:", e);
        }
      }

      has_run_one_time = true;

      const hot_reload_only =
        dev_config?.hotReloadCssBundle &&
        refresh_obj.changeType === "css-bundle";

      if (!hot_reload_only) {
        if (is_targeting_deno) {
          run_command_with_spawn_deno().catch((error) => {
            console.error(error);
          });

          return;
        }

        run_command_with_spawn().catch((error) => {
          console.error(error);
        });
      }
    });
  }

  const exclusions =
    dev_config?.watchExclusions?.map((x) => path.join(process.cwd(), x)) || [];

  const watcher = chokidar.watch(
    [path.join(process.cwd(), "src"), path.join(process.cwd(), "public")],
    {
      ignoreInitial: true,
      ignored: [path.join(process.cwd(), "public/dist"), ...exclusions],
    },
  );

  watcher.on("all", async (type, path) => {
    const is_change = type === "change";
    const normalized_path = path.replace(/\\/g, "/");
    const is_css_change =
      is_change &&
      normalized_path.includes("/src/styles/") &&
      normalized_path.endsWith(".css");
    const is_css_change_to_bundle =
      is_css_change && normalized_path.endsWith(".bundle.css");
    const is_css_change_to_critical =
      is_css_change && normalized_path.endsWith(".critical.css");

    hwyLog(
      is_css_change_to_bundle
        ? "Hot reloading CSS bundle..."
        : "Change detected, restarting server...",
    );

    try {
      await runBuildTasks({
        isDev: true,
        log: "triggered from chokidar watcher: " + path,
        changeType: is_css_change_to_critical
          ? "critical-css"
          : is_css_change_to_bundle
            ? "css-bundle"
            : "standard",
      });
    } catch (e) {
      console.error("ERROR: Build tasks failed:", e);
    }
  });

  let current_proc: ChildProcess | null = null;

  const base_env = {
    NODE_ENV: "development",
    PORT: String(dev_config?.port || "") || undefined,
  };

  async function run_command_with_spawn() {
    return new Promise<void>((resolve, reject) => {
      if (current_proc) {
        current_proc.kill();
      }

      const env = {
        ...base_env,
        ...process.env,
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
      ...base_env,
      ...Deno.env.toObject(),
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

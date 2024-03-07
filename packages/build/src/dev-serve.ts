import chokidar from "chokidar";
import dotenv from "dotenv";
import { ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { hwyLog } from "../../common/dev.mjs";
import {
  LIVE_REFRESH_RPC_PATH,
  RefreshFilePayload,
} from "../../common/index.mjs";
import { get_hwy_config } from "./get-hwy-config.js";
import { runBuildTasks } from "./run-build-tasks.js";

const hwy_config = await get_hwy_config();
let dev_config = hwy_config.dev;

function get_is_hot_reload_only(
  changeType: RefreshFilePayload["changeType"] | undefined,
): changeType is "css-bundle" | "critical-css" {
  return Boolean(
    hwy_config.dev?.hotReloadStyles && changeType && changeType !== "standard",
  );
}

async function devServe() {
  let has_run_one_time = false;

  hwyLog("Running in DEV mode.");

  dotenv.config();

  const refresh_watcher = chokidar.watch(
    path.join(process.cwd(), "dist", "refresh.txt"),
    { ignoreInitial: true },
  );

  refresh_watcher.on("all", async () => {
    const refresh_txt_path = path.join(process.cwd(), "dist", "refresh.txt");

    if (!fs.existsSync(refresh_txt_path)) {
      return;
    }

    const refresh_obj = JSON.parse(
      fs.readFileSync(refresh_txt_path, "utf8"),
    ) as RefreshFilePayload;

    if (has_run_one_time) {
      try {
        await fetch(
          `http://127.0.0.1:${dev_config?.port}${LIVE_REFRESH_RPC_PATH}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(refresh_obj),
          },
        );
      } catch (e) {
        console.error("Live refresh RPC failed:", e);
      }
    }

    has_run_one_time = true;

    const HOT_RELOAD_ONLY = get_is_hot_reload_only(refresh_obj.changeType);

    if (!HOT_RELOAD_ONLY) {
      run_command_with_spawn().catch((error) => {
        console.error(error);
      });
    }
  });

  const exclusions =
    dev_config?.watchExclusions?.map((x) => path.join(process.cwd(), x)) || [];
  const inclusions =
    dev_config?.watchInclusions?.map((x) => path.join(process.cwd(), x)) || [];

  const watcher = chokidar.watch(
    [
      path.join(process.cwd(), "src"),
      path.join(process.cwd(), "public"),
      ...inclusions,
    ],
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
        : is_css_change_to_critical
          ? "Hot reloading critical CSS..."
          : "Change detected, restarting server...",
    );

    try {
      await runBuildTasks({
        IS_DEV: true,
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

  // Watch for changes to hwy.config.* files
  // And if found, warn user they need to restart the server
  const config_watcher = chokidar.watch(
    path.join(process.cwd(), "hwy.config.*"),
    { ignoreInitial: true },
  );
  config_watcher.on("all", () => {
    hwyLog(
      "WARN",
      "Detected activity in your hwy.config.* file.",
      "Please restart your dev server for any changes to take effect.",
    );
  });

  // --- Node command runner ---

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

      // Make sure your .env overrides your Hwy config
      if (env.PORT) {
        if (!dev_config) {
          dev_config = {};
        }
        dev_config.port = Number(env.PORT);
      }

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

  try {
    await runBuildTasks({ IS_DEV: true, log: "triggered from dev-serve.js" });
  } catch (e) {
    console.error("ERROR: Build tasks failed:", e);
  }
}

export { devServe, get_is_hot_reload_only };

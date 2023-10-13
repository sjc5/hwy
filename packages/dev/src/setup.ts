import path from "node:path";
import dotenv from "dotenv";
import chokidar from "chokidar";
import { runBuildTasks } from "./run-build-tasks.js";
import { hwy_log } from "./hwy-log.js";
import { CHOKIDAR_RPC_PATH } from "./constants.js";

let has_run_one_time = false;

function devSetup(props: { watchExclusions?: string[]; port: number }) {
  hwy_log("RUNNING IN DEVELOPMENT MODE");

  dotenv.config();

  const refresh_watcher = chokidar.watch(
    path.join(process.cwd(), ".dev/refresh.txt"),
    { ignoreInitial: true },
  );

  refresh_watcher.on("all", async () => {
    if (has_run_one_time) {
      fetch(`http://localhost:${props?.port}${CHOKIDAR_RPC_PATH}`);
    }

    has_run_one_time = true;
  });

  const exclusions =
    props?.watchExclusions?.map((x) => path.join(process.cwd(), x)) ?? [];

  const watcher = chokidar.watch(
    [path.join(process.cwd(), "src"), path.join(process.cwd(), "public")],
    {
      ignoreInitial: true,
      ignored: [path.join(process.cwd(), "public/dist"), ...exclusions],
    },
  );

  watcher.on("all", async (_, path) => {
    hwy_log("Change detected, restarting server...");

    await runBuildTasks({
      isDev: true,
      log: "triggered from chokidar watcher: " + path,
    });
  });
}

export { devSetup };

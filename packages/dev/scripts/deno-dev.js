import { runBuildTasks } from "@hwy-js/dev";

let current_proc;

async function run_command_with_spawn() {
  if (current_proc) {
    try {
      current_proc.kill();
    } catch {
      // eat
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 50));

  const env = {
    ...Deno.env.toObject(),
    NODE_ENV: "development",
  };

  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", "dist/main.js"],
    env,
    stdout: "inherit",
    stderr: "inherit",
  });

  current_proc = cmd.spawn();
}

let timeout;

async function start_watcher() {
  for await (const event of Deno.watchFs(Deno.cwd() + "/.dev/refresh.txt")) {
    if (event.kind !== "access") {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(async () => {
        await run_command_with_spawn();
      }, 1);
    }
  }
}

start_watcher().catch((error) => console.error(error));

try {
  await runBuildTasks({ isDev: true, log: "triggered from deno-dev.js" });
} catch (e) {
  console.error("ERROR: Build tasks failed:", e);
}

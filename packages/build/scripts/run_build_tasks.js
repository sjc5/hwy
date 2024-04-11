#!/usr/bin/env node

try {
  const { runBuildTasks } = await import("../dist/index.js");

  await runBuildTasks({
    isDev: false,
    log: "run_build_tasks.js",
  });
} catch (e) {
  console.error("ERROR: Build tasks failed:", e);
}

#!/usr/bin/env node

try {
  const { runBuildTasks } = await import("../dist/index.js");
  await runBuildTasks({
    isDev: true,
    log: "triggered from run-build-tasks-dev.js",
  });
} catch (e) {
  console.error("ERROR: Build tasks failed:", e);
}

#!/usr/bin/env node

try {
  const { runBuildTasks } = await import("../dist/index.js");
  await runBuildTasks({
    isDev: false,
    log: "triggered from run-build-tasks.js",
  });
} catch (e) {
  console.error("ERROR: Build tasks failed:", e);
}

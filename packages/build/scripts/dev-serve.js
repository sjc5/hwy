#!/usr/bin/env node

try {
  const { devServe } = await import("../dist/index.js");

  await devServe();
} catch (e) {
  console.error("ERROR: Dev serve failed:", e);
}

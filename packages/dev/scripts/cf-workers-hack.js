#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function get_line(path_from_dist) {
  return `
    globalThis["${path_from_dist}"] = await import("${path_from_dist}");
  `;
}

function get_code(paths) {
  return paths.map(get_line).join("\n\n");
}

console.log("Running Cloudflare Workers hack...");

const page_paths = (
  await import(path.join(process.cwd(), "dist", "paths.js"))
).__hwy__paths.map((x) => "./" + x.importPath);

fs.writeFileSync(
  "./dist/main.js",
  `globalThis.__hwy__is_cloudflare = true;\n` +
    fs.readFileSync("./dist/main.js", "utf8") +
    "\n" +
    get_code([...page_paths]),
);

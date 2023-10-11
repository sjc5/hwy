#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function get_line(path_from_dist) {
  return `import("${path_from_dist}").then((x) => globalThis["${path_from_dist}"] = x);`;
}

function get_code(paths) {
  return paths.map(get_line).join("\n");
}

console.log("Running Cloudflare Pages hack...");

const page_paths = (
  await import(path.join(process.cwd(), "dist", "paths.js"))
).__hwy__paths.map((x) => "./" + x.importPath);

fs.writeFileSync(
  "dist/_worker.js",
  `globalThis.__hwy__is_cloudflare = true;\n` +
    `globalThis.__hwy__is_cloudflare_pages = true;\n` +
    fs.readFileSync("./dist/main.js", "utf8") +
    "\n" +
    get_code([...page_paths]),
);

// copy public folder into dist
fs.cpSync("./public", "./dist/public", { recursive: true });

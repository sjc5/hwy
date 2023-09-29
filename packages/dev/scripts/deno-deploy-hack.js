#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function get_line(path_from_dist) {
  return `await import("${path_from_dist}"); `;
}

function get_code(paths) {
  const pre = "if (0 > 1) { try { ";
  const post = "} catch {} }";
  return pre + paths.map(get_line).join("") + post;
}

console.log("Running Deno Deploy hack...");

const page_paths = (
  await import(path.join(process.cwd(), "dist", "paths.js"))
).default.map((x) => "./" + x.importPath);

const public_paths = (
  await import(pathToFileURL(path.join(process.cwd(), "dist", "public-map.js")))
).default.map((x) => "../" + x);

const other_paths = [
  "./standard-bundled-css-exists.js",
  "./critical-bundled-css.js",
  "./paths.js",
  "./public-map.js",
  "./public-reverse-map.js",
];

fs.writeFileSync(
  "./dist/main.js",
  fs.readFileSync("./dist/main.js", "utf8") +
    "\n" +
    get_code([...page_paths, ...public_paths, ...other_paths])
);

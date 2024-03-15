import fs from "node:fs";

const current_latest_hwy_core_version = JSON.parse(
  fs.readFileSync("../packages/core/package.json"),
).version;

console.log(
  "Current latest hwy core version:",
  current_latest_hwy_core_version + "\n",
);

const override_hwy_version = undefined;
console.log("Override hwy version:", override_hwy_version + "\n");

const hwy_version = override_hwy_version || current_latest_hwy_core_version;
console.log("Using hwy version:", hwy_version + "\n");

const hwy_pkg_regex = /"hwy": "([^"]+)"/;
const build_pkg_regex = /"@hwy-js\/build": "([^"]+)"/;
const client_pkg_regex = /"@hwy-js\/client": "([^"]+)"/;
const dev_pkg_regex = /"@hwy-js\/dev": "([^"]+)"/;

function replace_versions(pkg_json_string, version) {
  return pkg_json_string
    .replace(hwy_pkg_regex, `"hwy": "${version}"`)
    .replace(build_pkg_regex, `"@hwy-js/build": "${version}"`)
    .replace(client_pkg_regex, `"@hwy-js/client": "${version}"`)
    .replace(dev_pkg_regex, `"@hwy-js/dev": "${version}"`);
}

function to_workspace() {
  let pkg_json_string = fs.readFileSync("package.json", "utf-8");
  pkg_json_string = replace_versions(pkg_json_string, "workspace:*");
  fs.writeFileSync("package.json", pkg_json_string);
  console.log("Updated package.json to use workspace\n");
}

function to_latest() {
  let pkg_json_string = fs.readFileSync("package.json", "utf-8");
  pkg_json_string = replace_versions(pkg_json_string, hwy_version);
  fs.writeFileSync("package.json", pkg_json_string);
  console.log(`Updated package.json to use ${hwy_version}\n`);
}

export { to_latest, to_workspace };

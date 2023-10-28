import fs from "node:fs";

const current_docs_hwy_version = "0.5.0-beta.5";

const hwy_pkg_regex = /"hwy": "([^"]+)"/;
const build_pkg_regex = /"@hwy-js\/build": "([^"]+)"/;
const dev_pkg_regex = /"@hwy-js\/dev": "([^"]+)"/;

function replace_versions(pkg_json_string, version) {
  return pkg_json_string
    .replace(hwy_pkg_regex, `"hwy": "${version}"`)
    .replace(build_pkg_regex, `"@hwy-js/build": "${version}"`)
    .replace(dev_pkg_regex, `"@hwy-js/dev": "${version}"`);
}

function to_workspace() {
  let pkg_json_string = fs.readFileSync("package.json", "utf-8");

  pkg_json_string = replace_versions(pkg_json_string, "workspace:*");

  fs.writeFileSync("package.json", pkg_json_string);

  console.log("Updated package.json to use workspace");
}

function to_latest() {
  let pkg_json_string = fs.readFileSync("package.json", "utf-8");

  pkg_json_string = replace_versions(pkg_json_string, current_docs_hwy_version);

  fs.writeFileSync("package.json", pkg_json_string);

  console.log("Updated package.json to use latest");
}

export { to_workspace, to_latest };

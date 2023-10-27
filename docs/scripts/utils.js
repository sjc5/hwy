import fs from "node:fs";

const current_docs_hwy_version = "0.5.0-beta.0";

function to_workspace() {
  let pkg_json_string = fs.readFileSync("package.json", "utf-8");

  pkg_json_string = pkg_json_string
    .replace(`"hwy": "${current_docs_hwy_version}"`, `"hwy": "workspace:*"`)
    .replace(
      `"@hwy-js/build": "${current_docs_hwy_version}"`,
      `"@hwy-js/build": "workspace:*"`,
    )
    .replace(
      `"@hwy-js/dev": "${current_docs_hwy_version}"`,
      `"@hwy-js/dev": "workspace:*"`,
    );

  fs.writeFileSync("package.json", pkg_json_string);

  console.log("Updated package.json to use workspace");
}

function to_latest() {
  let pkg_json_string = fs.readFileSync("package.json", "utf-8");

  pkg_json_string = pkg_json_string
    .replace(`"hwy": "workspace:*"`, `"hwy": "${current_docs_hwy_version}"`)
    .replace(
      `"@hwy-js/build": "workspace:*"`,
      `"@hwy-js/build": "${current_docs_hwy_version}"`,
    )
    .replace(
      `"@hwy-js/dev": "workspace:*"`,
      `"@hwy-js/dev": "${current_docs_hwy_version}"`,
    );

  fs.writeFileSync("package.json", pkg_json_string);

  console.log("Updated package.json to use latest");
}

export { to_workspace, to_latest };

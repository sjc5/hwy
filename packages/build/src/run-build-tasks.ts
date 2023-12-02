import path from "node:path";
import fs from "node:fs";
import { generate_public_file_map, write_paths_to_file } from "./walk-pages.js";
import esbuild from "esbuild";
import { hwyLog, logPerf } from "./hwy-log.js";
import { exec as exec_callback } from "child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import {
  HWY_GLOBAL_KEYS,
  HWY_PREFIX,
  type RefreshFilePayload,
} from "../../common/index.mjs";
import { get_hwy_config } from "./get-hwy-config.js";
import { smart_normalize } from "./smart-normalize.js";

const FILE_NAMES = [
  "critical-bundled-css.js",
  "paths.js",
  "public-map.js",
  "public-reverse-map.js",
  "standard-bundled-css-exists.js",
];

const exec = promisify(exec_callback);

const hwy_config = await get_hwy_config();

async function handle_prebuild({ is_dev }: { is_dev: boolean }) {
  try {
    const pkg_json = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"),
    );
    const prebuild_script = pkg_json.scripts?.["hwy-prebuild"];
    const prebuild_dev_script = pkg_json.scripts?.["hwy-prebuild-dev"];

    if (!prebuild_script && !prebuild_dev_script) {
      return;
    }

    const should_use_dev_script = is_dev && prebuild_dev_script;

    const script_to_run = should_use_dev_script
      ? prebuild_dev_script
      : prebuild_script;

    if (!script_to_run) {
      return;
    }

    hwyLog(`Running ${script_to_run}`);

    const prebuild_p0 = performance.now();

    const { stdout, stderr } = await exec(script_to_run);

    const prebuild_p1 = performance.now();

    console.log(stdout);

    if (stderr) {
      console.error(stderr);
    }

    logPerf("pre-build tasks", prebuild_p0, prebuild_p1);
  } catch (error) {
    console.error("Error running pre-build tasks:", error);
  }
}

function write_refresh_txt({
  changeType,
  criticalCss,
}: {
  changeType: RefreshFilePayload["changeType"];
  criticalCss?: string;
}) {
  fs.writeFileSync(
    path.join(process.cwd(), "dist", "refresh.txt"),
    JSON.stringify({
      changeType,
      criticalCss,
      at: Date.now().toString(),
    } satisfies RefreshFilePayload),
  );
}

async function runBuildTasks({
  log,
  isDev,
  changeType,
}: {
  isDev: boolean;
  log?: string;
  changeType?: RefreshFilePayload["changeType"];
}) {
  const hot_reload_only =
    hwy_config.dev?.hotReloadCssBundle &&
    changeType &&
    changeType !== "standard";

  if (hot_reload_only) {
    // Why is this imported here? See the note in bundle-css-files.ts.
    // In this case, you're hot reloading, so we expect you to already
    // have the public-map.js file generated.
    const { bundle_css_files } = await import("./bundle-css-files.js");
    const css_bundle_res = await bundle_css_files();
    write_refresh_txt({
      changeType,
      criticalCss: css_bundle_res?.critical_css,
    });
    return;
  }

  hwyLog(`New build initiated${log ? ` (${log})` : ""}`);

  await handle_prebuild({ is_dev: isDev });

  hwyLog(`Running standard build tasks...`);

  const standard_tasks_p0 = performance.now();

  const dist_path = path.join(process.cwd(), "dist");

  await fs.promises.mkdir(dist_path, { recursive: true });

  // needs to happen once first pre-css bundling
  await generate_public_file_map();

  const is_using_client_entry =
    fs.existsSync(path.join(process.cwd(), "src/client.entry.ts")) ||
    fs.existsSync(path.join(process.cwd(), "src/client.entry.tsx")) ||
    fs.existsSync(path.join(process.cwd(), "src/client.entry.js")) ||
    fs.existsSync(path.join(process.cwd(), "src/client.entry.jsx"));

  // Why is this imported here? See the note in bundle-css-files.ts
  const { bundle_css_files } = await import("./bundle-css-files.js");

  // these need to come first for file map generation
  await Promise.all([
    bundle_css_files(),

    is_using_client_entry
      ? esbuild.build({
          entryPoints: ["src/client.entry.*"],
          bundle: true,
          outdir: "public/dist",
          treeShaking: true,
          platform: "browser",
          format: "esm",
          minify: true,
        })
      : undefined,
  ]);

  const [main_build_result] = await Promise.all([
    esbuild.build({
      entryPoints: ["src/main.*"],
      bundle: true,
      outdir: "dist",
      treeShaking: true,
      platform: "node",
      format: "esm",
      write: false,
      packages: "external",
    }),

    write_paths_to_file(),
  ]);

  /*
   * Time to finalize public file map. Must be post write_paths_to_file because the client
   * scripts are written during walk_pages inside write_paths_to_file.
   */
  await generate_public_file_map();

  let main_code = main_build_result.outputFiles?.[0].text;

  function convert_to_var_name(file_name: string) {
    return HWY_PREFIX + file_name.replace(/-/g, "_").replace(".js", "");
  }

  let files_text = await Promise.all(
    FILE_NAMES.map((file_name) => {
      return fs.promises.readFile(
        path.join(process.cwd(), `dist/${file_name}`),
        "utf-8",
      );
    }),
  );

  files_text = files_text.map((x, i) => {
    return x.replace("export ", "");
  });

  let to_be_appended = smart_normalize(files_text.join("\n\n"));

  to_be_appended =
    to_be_appended +
    `\n\n` +
    FILE_NAMES.map((x) => {
      const var_name = convert_to_var_name(x);
      return `globalThis["${var_name}"] = ${var_name};`;
    }).join("\n") +
    "\n\n";

  const dev_line = `globalThis.${HWY_GLOBAL_KEYS.is_dev} = ${isDev};\n`;

  const dep_target_line = `globalThis.${HWY_GLOBAL_KEYS.deployment_target} = "${hwy_config.deploymentTarget}";\n\n`;

  fs.writeFileSync(
    path.join(process.cwd(), "dist/main.js"),
    dev_line + dep_target_line + to_be_appended + main_code,
  );

  const path_import_snippet = `
await Promise.all(__hwy__paths.map(async function (x) {
  const path_from_dist = "./" + x.importPath;
  return import(path_from_dist).then((x) => globalThis[path_from_dist] = x);
}));
`.trim();

  if (hwy_config.deploymentTarget === "cloudflare-pages") {
    hwyLog("Customizing build output for Cloudflare Pages...");

    fs.writeFileSync(
      "dist/_worker.js",
      `import process from "node:process";\n` +
        `globalThis.process = process;\n` +
        fs.readFileSync("./dist/main.js", "utf8") +
        "\n" +
        path_import_snippet,
    );

    // copy public folder into dist
    fs.cpSync("./public", "./dist/public", { recursive: true });

    if (hwy_config.warmPaths === false) {
      // Everything is bundled anyway if target is cloudflare-pages
      hwyLog(
        "Setting warmPaths to false has no effect when deploymentTarget is cloudflare-pages.",
      );
    }
  }

  if (hwy_config.warmPaths !== false) {
    if (hwy_config.deploymentTarget !== "cloudflare-pages") {
      fs.writeFileSync(
        "dist/main.js",
        fs.readFileSync("./dist/main.js", "utf8") + "\n" + path_import_snippet,
      );
    }
  }

  if (hwy_config.deploymentTarget === "deno-deploy" && !isDev) {
    hwyLog("Customizing build output for Deno Deploy...");

    function get_line(path_from_dist: string) {
      return `await import("${path_from_dist}"); `;
    }

    function get_code(paths: Array<string>) {
      const pre = "if (0 > 1) { try { ";
      const post = "} catch {} }";
      return pre + paths.map(get_line).join("") + post;
    }

    const public_paths = Object.keys(
      (
        await import(
          pathToFileURL(path.join(process.cwd(), "dist", "public-map.js")).href
        )
      )[HWY_GLOBAL_KEYS.public_map],
    ).map((x) => "../" + x);

    const main_path = path.join(process.cwd(), "dist", "main.js");

    fs.writeFileSync(
      main_path,
      fs.readFileSync(main_path, "utf8") +
        "\n" +
        get_code([...public_paths, ...FILE_NAMES.map((x) => "./" + x)]),
    );
  }

  if (!isDev && hwy_config.deploymentTarget === "vercel-lambda") {
    hwyLog("Customizing build output for Vercel Serverless (Lambda)...");

    fs.cpSync("./dist", "./api", { recursive: true });
  }

  if (isDev) {
    write_refresh_txt({ changeType: "standard" });
  }

  const standard_tasks_p1 = performance.now();

  logPerf("standard build tasks", standard_tasks_p0, standard_tasks_p1);
}

export { runBuildTasks };

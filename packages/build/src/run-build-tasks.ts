import path from "node:path";
import fs from "node:fs";
import {
  generate_public_file_map,
  write_paths_to_file,
  type Paths,
} from "./walk-pages.js";
import esbuild from "esbuild";
import { hwy_log, log_perf } from "./hwy-log.js";
import { exec as exec_callback } from "child_process";
import { promisify } from "node:util";

const exec = promisify(exec_callback);

const hwy_config_exists = fs.existsSync(path.join(process.cwd(), "hwy.json"));

const hwy_config = hwy_config_exists
  ? JSON.parse(fs.readFileSync(path.join(process.cwd(), "hwy.json"), "utf-8"))
  : {};

const DEPLOYMENT_TARGET = hwy_config.deploymentTarget || "node";

async function handle_prebuild({ is_dev }: { is_dev: boolean }) {
  try {
    const pkg_json = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"),
    );
    const prebuild_script = pkg_json.scripts?.["hwy-prebuild"];
    const prebuild_dev_script = pkg_json.scripts?.["hwy-prebuild-dev"];

    if (!prebuild_script && !prebuild_dev_script) return;

    const should_use_dev_script = is_dev && prebuild_dev_script;

    const script_to_run = should_use_dev_script
      ? prebuild_dev_script
      : prebuild_script;

    if (!script_to_run) return;

    hwy_log(`Running ${script_to_run}`);

    const { stdout, stderr } = await exec(script_to_run);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error("Error running pre-build tasks:", error);
  }
}

async function runBuildTasks({ log, isDev }: { isDev: boolean; log?: string }) {
  const IS_DEV = isDev;

  hwy_log(`New build initiated${log ? ` (${log})` : ""}`);

  hwy_log(`Running pre-build tasks...`);

  const prebuild_p0 = performance.now();
  await handle_prebuild({ is_dev: IS_DEV });
  const prebuild_p1 = performance.now();
  log_perf("pre-build tasks", prebuild_p0, prebuild_p1);

  hwy_log(`Running standard build tasks...`);

  const standard_tasks_p0 = performance.now();

  await fs.promises.rm(path.join(process.cwd(), "dist"), {
    recursive: true,
    force: true,
  });

  await fs.promises.mkdir(path.join(process.cwd(), "dist"), {
    recursive: true,
  });

  // needs to happen once first pre-css bundling
  await generate_public_file_map();

  const is_using_client_entry =
    fs.existsSync(path.join(process.cwd(), "src/client.entry.ts")) ||
    fs.existsSync(path.join(process.cwd(), "src/client.entry.js"));

  const { bundle_css_files } = await import("./bundle-css-files.js");

  // needs to come first for file map generation
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
      packages: "external",
      format: "esm",
      write: false,
    }),

    write_paths_to_file(),

    // happens again post css bundling
    generate_public_file_map(),

    IS_DEV
      ? fs.promises.mkdir(path.join(process.cwd(), ".dev"), {
          recursive: true,
        })
      : undefined,
  ]);

  let main_code = main_build_result.outputFiles?.[0].text;

  const file_names = [
    "critical-bundled-css.js",
    "paths.js",
    "public-map.js",
    "public-reverse-map.js",
    "standard-bundled-css-exists.js",
  ];

  function convert_to_var_name(file_name: string) {
    return "__hwy__" + file_name.replace(/-/g, "_").replace(".js", "");
  }

  let files_text = await Promise.all(
    file_names.map((file_name) => {
      return fs.promises.readFile(
        path.join(process.cwd(), `dist/${file_name}`),
        "utf-8",
      );
    }),
  );

  files_text = files_text.map((x, i) => {
    return x.replace("export ", "");
  });

  let to_be_appended = files_text.join("\n\n");

  to_be_appended =
    to_be_appended +
    `\n\n` +
    file_names
      .map((x) => {
        const var_name = convert_to_var_name(x);
        return `globalThis["${var_name}"] = ${var_name};`;
      })
      .join("\n") +
    "\n\n";

  fs.writeFileSync(
    path.join(process.cwd(), "dist/main.js"),
    to_be_appended + main_code,
  );

  if (DEPLOYMENT_TARGET === "cloudflare-pages") {
    console.log("Customizing for Cloudflare Pages...");

    function get_line(path_from_dist: string) {
      return `import("${path_from_dist}").then((x) => globalThis["${path_from_dist}"] = x);`;
    }

    function get_code(paths: string[]) {
      return paths.map(get_line).join("\n");
    }

    const page_paths = (
      await import(path.join(process.cwd(), "dist", "paths.js"))
    ).__hwy__paths.map((x: Paths[number]) => "./" + x.importPath);

    fs.writeFileSync(
      "dist/_worker.js",
      `import process from "node:process";\n` +
        `globalThis.process = process;\n` +
        `globalThis.__hwy__is_cloudflare = true;\n` +
        `globalThis.__hwy__is_cloudflare_pages = true;\n` +
        fs.readFileSync("./dist/main.js", "utf8") +
        "\n" +
        get_code([...page_paths]),
    );

    // copy public folder into dist
    fs.cpSync("./public", "./dist/public", { recursive: true });
  }

  if (IS_DEV) {
    fs.writeFileSync(
      path.join(process.cwd(), ".dev/refresh.txt"),
      Date.now().toString(),
    );
  }

  const standard_tasks_p1 = performance.now();

  log_perf("standard build tasks", standard_tasks_p0, standard_tasks_p1);
}

export { runBuildTasks };

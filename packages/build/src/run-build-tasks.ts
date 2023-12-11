import path from "node:path";
import fs from "node:fs";
import {
  generate_public_file_map,
  write_paths_to_disk,
  type Paths,
} from "./walk-pages.js";
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
import { get_is_hot_reload_only } from "./dev-serve.js";

export let ALL_MODULE_DEF_NAMES = [] as Array<string>;

const FILE_NAMES = [
  "critical-bundled-css.js",
  "paths.js",
  "public-map.js",
  "public-reverse-map.js",
  "standard-bundled-css-exists.js",
] as const;

const exec = promisify(exec_callback);
const hwy_config = await get_hwy_config();
const SHOULD_BUNDLE_PATHS =
  hwy_config.routeStrategy === "bundle" ||
  hwy_config.deploymentTarget === "cloudflare-pages";

const IS_PREACT = hwy_config.mode === "preact-mpa";

console.log({ IS_PREACT });

async function runBuildTasks({
  IS_DEV,
  log,
  changeType,
}: {
  IS_DEV?: boolean;
  log?: string;
  changeType?: RefreshFilePayload["changeType"];
}) {
  const IS_PROD = !IS_DEV;

  // IDEA -- Should probably split "pre-build" into CSS pre-processing and other pre-processing
  hwyLog(`New build initiated${log ? ` (${log})` : ""}`);
  await handle_prebuild({ IS_DEV });

  const HOT_RELOAD_ONLY = get_is_hot_reload_only(changeType);

  if (HOT_RELOAD_ONLY) {
    /*
     * Why is "bundle_css_files" dynamically imported here?
     * That file needs to only run once you have a public-map.js file.
     * In this case, you're hot reloading, so we expect you to already
     * have the public-map.js file generated.
     */
    const { bundle_css_files } = await import("./bundle-css-files.js");

    const css_bundle_res = await bundle_css_files();

    await write_refresh_txt({
      changeType,
      criticalCss: css_bundle_res?.critical_css,
    });

    return;
  }

  hwyLog(`Running standard build tasks...`);
  const standard_tasks_p0 = performance.now();

  const dist_path = path.join(process.cwd(), "dist");
  const public_path = path.join(process.cwd(), "public");

  await Promise.all([
    fs.promises.mkdir(dist_path, { recursive: true }),
    fs.promises.mkdir(public_path, { recursive: true }),
  ]);

  const is_using_client_entry = get_is_using_client_entry();
  const path_to_module_defs_file = path.join(
    process.cwd(),
    "src",
    "modules.client.ts",
  );

  const is_using_module_defs_file = fs.existsSync(path_to_module_defs_file);

  let module_defs: any;

  if (is_using_module_defs_file) {
    await esbuild.build({
      entryPoints: [path_to_module_defs_file],
      bundle: true,
      outfile: "dist/client-modules-temp.js",
      treeShaking: true,
      platform: "node",
      format: "esm",
      minify: true,
    });

    module_defs = (
      await import(
        pathToFileURL(path.join(process.cwd(), "dist/client-modules-temp.js"))
          .href
      )
    ).default;

    // delete client-modules-temp.js file
    if (is_using_module_defs_file) {
      await fs.promises.rm(
        path.join(process.cwd(), "dist/client-modules-temp.js"),
      );
    }
  }

  ALL_MODULE_DEF_NAMES = module_defs?.flatMap((x: any) => x.names) ?? [];

  /********************* STEP 1 *********************
   * GENERATE PUBLIC FILE MAP -- TAKE 1
   */
  await generate_public_file_map();

  /*
   * Why is "bundle_css_files" dynamically imported here?
   * Needs to come after generating the public file map,
   * which now we have just done above.
   */
  const { bundle_css_files } = await import("./bundle-css-files.js");

  /********************* STEP 2 *********************
   * BUNDLE CSS FILES AND CLIENT ENTRY
   */

  await Promise.all([
    bundle_css_files(),

    // BUNDLE YOUR MAIN CLIENT ENTRY, BUT EXCLUDE PREACT (PREACT IS BY ITSELF AND IN IMPORT MAP)
    is_using_client_entry
      ? esbuild.build({
          entryPoints: ["src/entry.client.*"],
          bundle: true,
          outdir: "public/dist",
          treeShaking: true,
          platform: "browser",
          format: "esm",
          minify: true,
          external: ALL_MODULE_DEF_NAMES,
        })
      : undefined,

    ...(is_using_module_defs_file
      ? module_defs.map((x: any, i: number) => {
          let external = ALL_MODULE_DEF_NAMES.filter((module_name: any) => {
            return !x.names.includes(module_name);
          });
          external = [...external, ...(x.external ?? [])];
          external = [...new Set(external)];

          const base = {
            bundle: true,
            outfile: `public/dist/${i}.js`,
            treeShaking: true,
            platform: "browser",
            format: "esm",
            minify: true,
            external,
          } as const;

          if ("code" in x) {
            return esbuild.build({
              stdin: {
                contents: x.code,
                resolveDir: path.resolve("dist"),
              },
              ...base,
            });
          }

          if ("pathFromRoot" in x) {
            return esbuild.build({
              entryPoints: x.pathsFromRoot,
              ...base,
            });
          }
        })
      : []),
  ]);

  /********************* STEP 3 *********************
   * BUILD SERVER ENTRY AND WRITE PATHS TO DISK
   *
   * Note that we're putting the server entry code into memory
   * at this point, and not yet writing it to disk. We'll modify
   * it and write it to disk later.
   */
  const [main_build_result] = await Promise.all([
    esbuild.build({
      entryPoints: ["src/entry.server.*"],
      bundle: true,
      outdir: "dist",
      treeShaking: true,
      platform: "node",
      format: "esm",
      minify: false,
      write: false,
      packages: "external",
    }),

    write_paths_to_disk(IS_DEV),
  ]);

  /********************* STEP 4 *********************
   * GENERATE PUBLIC FILE MAP -- TAKE 2
   *
   * Needs to come after writing paths to disk.
   * This is because the client scripts are written during walk_pages inside write_paths_to_disk.
   * This is the last time we generate the public file map -- now final
   */
  await generate_public_file_map();

  /********************* STEP 5 *********************
   * PREPARE AND WRITE SERVER ENTRY CODE TO DISK
   *
   * Recall that our server entry code is in memory at this point.
   * We're going to modify it and write it to disk.
   */

  // Grab the specific build output we need -- server entry code
  let main_code = main_build_result.outputFiles?.[0].text;

  /*
   * Grab the rest of the build outputs (previously written to disk)
   * as text in memory. This is a string array.
   */
  let files_text = await Promise.all(
    FILE_NAMES.map((file_name) => {
      return fs.promises.readFile(
        path.join(process.cwd(), `dist/${file_name}`),
        "utf-8",
      );
    }),
  );

  /*
   * Remove "export " from each file representation
   * so we can append them to the server entry code
   */
  files_text = files_text.map((x, i) => {
    return x.replace("export ", "");
  });

  /*
   * Prepare to append those file contents into main server entry code
   *
   * The "smart normalize" function only matters for people dev'ing on
   * Windows and deploying to Cloudflare Pages.
   *
   * This is now one big string, separated by double newlines.
   */
  let to_be_appended = smart_normalize(files_text.join("\n\n"));

  /*
   * This effectively puts each piece of our build outputs into a globally
   * accessible variable. This is how we can access things like the CSS
   * bundle and the public file map at runtime when we need them.
   */
  to_be_appended =
    to_be_appended +
    `\n\n` +
    FILE_NAMES.map((x) => {
      const var_name = convert_to_var_name(x);
      return `globalThis["${var_name}"] = ${var_name};`;
    }).join("\n") +
    "\n\n";

  /*
   * Set up some additional global variables
   * Includes "is_dev", "deployment_target", and "route_strategy"
   * This is how we can know these settings at runtime
   */
  const dev_line = `globalThis.${HWY_GLOBAL_KEYS.is_dev} = ${IS_DEV};\n`;
  const dep_target_line = `globalThis.${HWY_GLOBAL_KEYS.deployment_target} = "${hwy_config.deploymentTarget}";\n`;
  const route_strategy_line = `globalThis.${HWY_GLOBAL_KEYS.route_strategy} = "${hwy_config.routeStrategy}";\n`;
  const mode_line = `globalThis.${HWY_GLOBAL_KEYS.mode} = "${hwy_config.mode}";\n`;
  const use_dot_server_files_line = `globalThis.${HWY_GLOBAL_KEYS.use_dot_server_files} = ${hwy_config.useDotServerFiles};\n`;
  const import_map_setup_line = `globalThis.${
    HWY_GLOBAL_KEYS.import_map_setup
  } = ${JSON.stringify(
    ALL_MODULE_DEF_NAMES.map((x: string) => {
      const index = module_defs.findIndex((y: any) => {
        return y.names.includes(x);
      });
      return {
        name: x,
        index,
      };
    }),
  )};\n`;

  /*
   * Now put it all together and write entry.server.js to disk
   */
  await fs.promises.writeFile(
    path.join(process.cwd(), "dist/entry.server.js"),
    dev_line +
      dep_target_line +
      route_strategy_line +
      mode_line +
      use_dot_server_files_line +
      import_map_setup_line +
      to_be_appended +
      main_code,
  );

  /*
   * Now we have our baseline entry.server.js code in the dist folder on disk.
   */

  /********************* STEP 6 *********************
   * APPEND ROUTE LOADING STRATEGY CODE TO SERVER ENTRY
   *
   * Only applicable for "bundle" and "warm-cache-at-startup" route loading strategies.
   */
  if (
    SHOULD_BUNDLE_PATHS ||
    hwy_config.routeStrategy === "warm-cache-at-startup"
  ) {
    await handle_custom_route_loading_code(IS_DEV);
  }

  // If PROD, handle deploy target revisions
  if (IS_PROD) {
    // VERCEL
    if (hwy_config.deploymentTarget === "vercel-lambda") {
      hwyLog("Customizing build output for Vercel Serverless (Lambda)...");

      await fs.promises.cp("./dist", "./api", { recursive: true });
    }

    // DENO DEPLOY
    if (hwy_config.deploymentTarget === "deno-deploy") {
      // Needs to come after any bundling!
      await handle_deno_deploy_hacks();
    }
  }

  if (IS_DEV) {
    await write_refresh_txt({ changeType: "standard" });
  }

  const standard_tasks_p1 = performance.now();

  logPerf("standard build tasks", standard_tasks_p0, standard_tasks_p1);
}

export { runBuildTasks };

/* -------------------------------------------------------------------------- */

async function handle_deno_deploy_hacks() {
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

  const main_path = path.join(process.cwd(), "dist", "entry.server.js");

  await fs.promises.writeFile(
    main_path,
    (await fs.promises.readFile(main_path, "utf8")) +
      "\n" +
      get_code([...public_paths, ...FILE_NAMES.map((x) => "./" + x)]),
  );
}

/* -------------------------------------------------------------------------- */

async function handle_prebuild({ IS_DEV }: { IS_DEV?: boolean }) {
  try {
    const pkg_json = JSON.parse(
      await fs.promises.readFile(
        path.join(process.cwd(), "package.json"),
        "utf-8",
      ),
    );
    const prebuild_script = pkg_json.scripts?.["hwy-prebuild"];
    const prebuild_dev_script = pkg_json.scripts?.["hwy-prebuild-dev"];

    if (!prebuild_script && !prebuild_dev_script) {
      return;
    }

    const should_use_dev_script = IS_DEV && prebuild_dev_script;

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

/* -------------------------------------------------------------------------- */

async function write_refresh_txt({
  changeType,
  criticalCss,
}: {
  changeType: RefreshFilePayload["changeType"];
  criticalCss?: string;
}) {
  await fs.promises.writeFile(
    path.join(process.cwd(), "dist", "refresh.txt"),
    JSON.stringify({
      changeType,
      criticalCss,
      at: Date.now().toString(),
    } satisfies RefreshFilePayload),
  );
}

/* -------------------------------------------------------------------------- */

function convert_to_var_name(file_name: string) {
  return (
    HWY_PREFIX +
    file_name
      .replace(/-/g, "_")
      .replace(".js", "")
      .replace(/\//g, "")
      .replace(/\./g, "_")
  );
}

/* -------------------------------------------------------------------------- */

function get_is_using_client_entry() {
  const file_endings = [".js", ".ts", ".jsx", ".tsx"];

  for (const ending of file_endings) {
    if (fs.existsSync(path.join(process.cwd(), `src/entry.client${ending}`))) {
      return true;
    }
  }
}

/* -------------------------------------------------------------------------- */

async function get_path_import_snippet() {
  if (hwy_config.routeStrategy === "warm-cache-at-startup") {
    return `
${HWY_PREFIX}paths.forEach(function (x) {
  const path_from_dist = "./" + x.importPath;
  import(path_from_dist).then((x) => globalThis[path_from_dist] = x);
  ${
    hwy_config.useDotServerFiles
      ? `
  if (x.hasSiblingServerFile) {
    const server_path_from_dist = path_from_dist.slice(0, -3) + ".server.js";
    import(server_path_from_dist).then((x) => globalThis[server_path_from_dist] = x);
  }
    `.trim() + "\n"
      : ""
  }
});
        `.trim();
  }

  if (SHOULD_BUNDLE_PATHS) {
    // Read the paths from disk. Results in an array of path objects.
    const paths_import_list = (
      await import(
        pathToFileURL(path.join(process.cwd(), "dist/paths.js")).href
      )
    )[HWY_GLOBAL_KEYS.paths] as Paths;

    /*
     * For bundling strategy, we want to literally import all the contents of each path file
     * and put them into a global variable. This is how we can access each route at runtime.
     * This is the snippet that will be appended to entry.server.js for the "bundle" route loading strategy
     */
    return paths_import_list
      .map((x) => {
        return `
import * as ${convert_to_var_name(x.importPath)} from "./${x.importPath}";
globalThis["./${x.importPath}"] = ${convert_to_var_name(x.importPath)};
${
  hwy_config.useDotServerFiles && x.hasSiblingServerFile
    ? `import * as ${convert_to_var_name(
        x.importPath.slice(0, -3) + ".server.js",
      )} from "./${x.importPath.slice(0, -3) + ".server.js"}";
  globalThis["./${
    x.importPath.slice(0, -3) + ".server.js"
  }"] = ${convert_to_var_name(x.importPath.slice(0, -3) + ".server.js")};`
    : ""
}
      `.trim();
      })
      .join("\n");
  }

  return "";
}

/* -------------------------------------------------------------------------- */

async function handle_custom_route_loading_code(IS_DEV?: boolean) {
  const IS_CLOUDFLARE = hwy_config.deploymentTarget === "cloudflare-pages";
  if (IS_CLOUDFLARE) {
    // This writes the main server entry to disk as _worker.js
    hwyLog("Customizing build output for Cloudflare Pages...");

    await Promise.all([
      fs.promises.writeFile(
        "dist/_worker.js",
        `import process from "node:process";\n` +
          `globalThis.process = process;\n` +
          fs.readFileSync("./dist/entry.server.js", "utf8") +
          "\n" +
          (await get_path_import_snippet()),
      ),

      // copy public folder into dist
      fs.promises.cp("./public", "./dist/public", { recursive: true }),
    ]);

    // rmv dist/entry.server.js file -- no longer needed if bundling routes
    await fs.promises.rm(path.join(process.cwd(), "dist/entry.server.js"));
  } else {
    // Write the final entry.server.js to disk again, with the route loading strategy appended
    await fs.promises.writeFile(
      "dist/entry.server.js",
      (await fs.promises.readFile("./dist/entry.server.js", "utf8")) +
        "\n" +
        (await get_path_import_snippet()),
    );
  }

  /*
   * Bundle paths with server entry, if applicable.
   * Needs to come after appending route loading strategy.
   */
  if (SHOULD_BUNDLE_PATHS) {
    await esbuild.build({
      entryPoints: [IS_CLOUDFLARE ? "dist/_worker.js" : "dist/entry.server.js"],
      bundle: true,
      outfile: IS_CLOUDFLARE ? "dist/_worker.js" : "dist/entry.server.js",
      treeShaking: true,
      platform: "node",
      format: "esm",
      minify: false,
      write: true,
      packages: "external",
      allowOverwrite: true,
    });

    // rmv dist/pages folder -- no longer needed if bundling routes
    await fs.promises.rm(path.join(process.cwd(), "dist/pages"), {
      recursive: true,
    });
  }

  // rmv the rest
  await Promise.all(
    FILE_NAMES.map((x) => {
      return fs.promises.rm(path.join(process.cwd(), `dist/${x}`));
    }),
  );
}

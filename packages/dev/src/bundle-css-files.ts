import path from "node:path";
import fs from "node:fs";
import esbuild from "esbuild";
import { hwy_log } from "./hwy-log.js";
import { get_hashed_public_url_low_level } from "./hashed-public-url.js";
import { pathToFileURL } from "node:url";

const public_map_path = path.resolve("dist", "public-map.js");

const public_map: Record<string, string> | undefined = (
  await import(pathToFileURL(public_map_path).href)
).__hwy__public_map;

const URL_REGEX = /url\(\s*['"]([^'"]*)['"]\s*\)/g;

function replacer(_: string, p1: string) {
  if (!public_map) {
    throw new Error("No public map found");
  }

  const hashed = get_hashed_public_url_low_level({
    public_map,
    url: p1,
  });

  return `url("${hashed}")`;
}

async function bundle_css_files() {
  const using_styles_dir = fs.existsSync(path.resolve("./src/styles"));
  if (!using_styles_dir) {
    hwy_log("Not using styles directory, skipping css bundling...");
    return;
  }
  const directory_path = path.resolve("src/styles");
  const files = await fs.promises.readdir(directory_path);

  const standard_css_paths = files
    .filter((file) => file.endsWith(".bundle.css"))
    .map((file) => path.join(directory_path, file))
    .sort();

  const critical_css_paths = files
    .filter((file) => file.endsWith(".critical.css"))
    .map((file) => path.join(directory_path, file))
    .sort();

  async function build_standard_css() {
    const promises = await Promise.all(
      standard_css_paths.map((x) => fs.promises.readFile(x, "utf-8")),
    );

    const standard_css_text = promises.join("\n").replace(URL_REGEX, replacer);

    function write_standard_bundled_css_exists(does_exist: boolean) {
      fs.writeFileSync(
        path.join(process.cwd(), "dist/standard-bundled-css-exists.js"),
        `export const __hwy__standard_bundled_css_exists = ${does_exist};`,
      );
    }

    if (standard_css_paths.length) {
      await esbuild.build({
        stdin: {
          contents: standard_css_text,
          resolveDir: path.resolve("src/styles"),
          loader: "css",
        },
        outfile: path.resolve("public/dist/standard-bundled.css"),
        minify: true,
      });

      write_standard_bundled_css_exists(true);
    } else {
      write_standard_bundled_css_exists(false);
    }
  }

  async function build_critical_css() {
    const promises = await Promise.all(
      critical_css_paths.map((x) => fs.promises.readFile(x, "utf-8")),
    );

    const critical_css_text = promises.join("\n").replace(URL_REGEX, replacer);

    if (critical_css_paths.length) {
      const result = await esbuild.build({
        stdin: {
          contents: critical_css_text,
          resolveDir: path.resolve("src/styles"),
          loader: "css",
        },
        write: false,
        minify: true,
      });

      if (result.errors.length) {
        console.error(result.errors.join("\n"));
      }

      const css = result.outputFiles[0].text.trim();

      fs.writeFileSync(
        path.join(process.cwd(), "dist/critical-bundled-css.js"),
        `export const __hwy__critical_bundled_css = \`${css}\`;`,
      );
    } else {
      fs.writeFileSync(
        path.join(process.cwd(), "dist/critical-bundled-css.js"),
        `export const __hwy__critical_bundled_css = undefined;`,
      );
    }
  }

  await Promise.all([build_standard_css(), build_critical_css()]);
}

export { bundle_css_files };

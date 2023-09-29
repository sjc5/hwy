import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import readdirp from "readdirp";
import esbuild from "esbuild";

async function walk_pages() {
  const paths: {
    // ultimately public
    entry: string;
    importPath: string;
    path: string;
    segments: Array<{
      isSplat: boolean;
      isDynamic: boolean;
      name: string;
      segment: string;
    }>;
    isIndex: boolean;
    endsInSplat: boolean;
    endsInDynamic: boolean;
  }[] = [];

  for await (const entry of readdirp(path.resolve("./src/pages"))) {
    if (!entry.path.includes(".page.")) continue;

    const ext = entry.path.split(".").pop();

    const permitted_extensions = [
      "js",
      "jsx",
      "ts",
      "tsx",
      "mjs",
      "cjs",
      "mts",
      "cts",
    ];

    if (!ext || !permitted_extensions.includes(ext)) continue;

    const _path = entry.path.replace("." + ext, "").replace(".page", "");

    const segments_init = _path.split(path.sep);

    let is_index = false;

    const segments = segments_init
      .filter((segment) => {
        if (segment.startsWith("__") && !segment.includes(".page.")) {
          return false;
        }
        return true;
      })
      .map((segment) => {
        let new_segment = segment.replace("$", ":");

        let is_splat = false;

        if (new_segment === ":") {
          new_segment = ":catch*";
          is_splat = true;
        }

        if (new_segment === "_index") {
          new_segment = "";
          is_index = true;
        }

        const name = new_segment.replace(":", "");

        return {
          // ultimately public
          isSplat: is_splat,
          isDynamic: !is_splat && new_segment.startsWith(":"),
          name,
          segment: new_segment,
        };
      });

    const import_path_tsx =
      path.join(process.cwd(), "src/pages/" + _path) + ".page" + ("." + ext);

    let path_to_use = "/" + segments.map((x) => x.segment).join("/");

    if (path_to_use !== "/" && path_to_use.endsWith("/")) {
      path_to_use = path_to_use.slice(0, -1);
    }

    paths.push({
      entry: entry.path,
      importPath: "pages/" + _path + ".js",
      path: path_to_use,
      segments,
      isIndex: is_index,
      endsInSplat: segments[segments.length - 1].isSplat,
      endsInDynamic: segments[segments.length - 1].isDynamic,
    });

    try {
      await esbuild.build({
        entryPoints: [import_path_tsx],
        bundle: true,
        outfile: path.resolve("./dist/pages/" + _path + ".js"),
        treeShaking: true,
        platform: "node",
        packages: "external",
        format: "esm",
      });
    } catch (e) {
      console.error(e);
    }
  }

  return paths;
}

async function write_paths_to_file() {
  const paths = await walk_pages();
  const output_dir = path.join(process.cwd(), "dist");
  fs.writeFileSync(
    path.join(output_dir, "paths.js"),
    `export default ${JSON.stringify(paths)}`
  );
}

async function generate_file_hash(file_path: string): Promise<string> {
  const content = await fs.promises.readFile(file_path);
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return hash.slice(0, 12); // Take the first 12 characters for brevity.
}

async function generate_public_file_map() {
  const src_path = path.resolve("./public");

  const file_map: { [original: string]: string } = {};
  const reverse_file_map: { [hashed: string]: string } = {};

  async function traverse(src_dir: string): Promise<void> {
    const entries = await fs.promises.readdir(src_dir, { withFileTypes: true });

    const tasks: Promise<void>[] = entries.map(async (entry) => {
      const src_entry = path.join(src_dir, entry.name);
      const relative_entry = path.join(
        "public",
        path.relative(src_path, src_entry)
      );

      if (entry.isDirectory()) {
        return traverse(src_entry);
      } else {
        const hash = await generate_file_hash(src_entry);
        const extname = path.extname(entry.name);
        const basename = path.basename(entry.name, extname);
        const hashed_filename = `${basename}.${hash}${extname}`;
        const hashed_relative_path = path.join(
          "public",
          path.relative(
            src_path,
            src_entry.replace(basename + extname, hashed_filename)
          )
        );
        file_map[relative_entry] = hashed_relative_path;
        reverse_file_map[hashed_relative_path] = relative_entry;
      }
    });

    await Promise.all(tasks);
  }

  await traverse(src_path);

  const map_file_path = path.resolve("./dist/public-map.js");
  const reverse_map_file_path = path.resolve("./dist/public-reverse-map.js");

  await Promise.all([
    fs.promises.writeFile(
      map_file_path,
      `export default ${JSON.stringify(file_map)};`,
      "utf-8"
    ),
    fs.promises.writeFile(
      reverse_map_file_path,
      `export default ${JSON.stringify(reverse_file_map)};`,
      "utf-8"
    ),
  ]);
}

export { generate_file_hash, write_paths_to_file, generate_public_file_map };
export type Paths = Awaited<ReturnType<typeof walk_pages>>;

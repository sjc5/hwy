import crypto from "node:crypto";
import fs from "node:fs";
import nodePath from "node:path";
import readdirp from "readdirp";
import { HWY_GLOBAL_KEYS } from "../../common/index.mjs";
import { Path, PathType, SPLAT_SEGMENT } from "../../core/src/router.js";
import { getHwyConfig } from "./get-hwy-config.js";

const permittedExts = ["js", "jsx", "ts", "tsx", "mjs", "cjs", "mts", "cts"];

type FilesList = Array<{
  path: string;
  importPathWithOrigExt: string;
}>;

async function walkPages(): Promise<{
  paths: Array<Path>;
  pageFilesList: FilesList;
  serverFilesList: FilesList;
}> {
  let pageFilesList: FilesList = [];
  let serverFilesList: FilesList = [];

  const paths: Paths = [];

  for await (const entry of readdirp(nodePath.resolve("./src/pages"))) {
    const isPageFile = entry.path.includes(".page.");
    const isServerFile = entry.path.includes(".server.");

    if (!isPageFile && !isServerFile) {
      continue;
    }

    const ext = entry.path.split(".").pop();

    if (!ext || !permittedExts.includes(ext)) {
      continue;
    }

    const preExtDelineator = isPageFile
      ? ".page"
      : isServerFile
        ? ".server"
        : ".client";

    const path = entry.path
      .replace("." + ext, "")
      .replace(preExtDelineator, "");

    const segmentsInit = path.split(nodePath.sep);

    let isIndex = false;

    const segments = segmentsInit
      .filter((segment) => {
        if (segment.startsWith("__") && !segment.includes(".page.")) {
          return false;
        }
        return true;
      })
      .map((segment) => {
        let newSegment: string | null = segment.replace("$", ":");

        let isSplat = false;

        if (newSegment === ":") {
          newSegment = SPLAT_SEGMENT;
          isSplat = true;
        }

        if (newSegment === "_index") {
          newSegment = null;
          isIndex = true;
        }

        type SegmentType = "normal" | "index" | "splat" | "dynamic";

        let segmentType: SegmentType = "normal";

        if (isSplat) {
          segmentType = "splat";
        } else if (newSegment?.startsWith(":")) {
          segmentType = "dynamic";
        } else if (isIndex) {
          segmentType = "index";
        }

        return {
          segment: newSegment || undefined,
          segmentType: segmentType,
        };
      });

    const importPathWithOrigExt =
      nodePath.join(process.cwd(), "src/pages/" + path) +
      preExtDelineator +
      ("." + ext);

    let pathToUse = "/" + segments.map((x) => x.segment).join("/");

    if (pathToUse !== "/" && pathToUse.endsWith("/")) {
      pathToUse = pathToUse.slice(0, -1);
    }

    if (isPageFile || isServerFile) {
      let hasSiblingPageFile = false;
      let hasSiblingServerFile = false;

      for (const sibling of await fs.promises.readdir(
        nodePath.dirname(importPathWithOrigExt),
      )) {
        const filename = nodePath.basename(path);

        if (isPageFile && sibling.includes(filename + ".server.")) {
          hasSiblingServerFile = true;

          break;
        }

        if (isServerFile && sibling.includes(filename + ".page.")) {
          hasSiblingPageFile = true;

          break;
        }
      }

      let pathType: PathType = "static-layout";

      if (isIndex) {
        pathType = "index";
      } else if (segments[segments.length - 1].segmentType === "splat") {
        pathType = "non-ultimate-splat";
      } else if (segments[segments.length - 1].segmentType === "dynamic") {
        pathType = "dynamic-layout";
      }

      if (isServerFile && !hasSiblingPageFile) {
        paths.push({
          importPath: "pages/" + path + ".server.js",
          pattern: pathToUse,
          segments: segments.map((x) => x.segment || ""),
          pathType: pathType,
          hasSiblingServerFile: false,
          isServerFile: true,
        });
      }

      if (isPageFile) {
        paths.push({
          importPath: "pages/" + path + ".page.js",
          pattern: pathToUse,
          segments: segments.map((x) => x.segment || ""),
          pathType: pathType,
          hasSiblingServerFile: hasSiblingServerFile,
          isServerFile: false,
        });
      }
    }

    await fs.promises.mkdir(nodePath.resolve(`./public/dist/`), {
      recursive: true,
    });

    try {
      if (isServerFile) {
        serverFilesList.push({ path, importPathWithOrigExt });
      }

      if (isPageFile) {
        pageFilesList.push({ path, importPathWithOrigExt });
      }
    } catch (e) {
      console.error(e);
    }
  }

  return {
    paths,
    pageFilesList,
    serverFilesList,
  };
}

async function writePathsToDisk() {
  const { paths, pageFilesList, serverFilesList } = await walkPages();

  await fs.promises.writeFile(
    nodePath.join(process.cwd(), "dist", "paths.js"),
    `export const ${HWY_GLOBAL_KEYS.paths} = ${JSON.stringify(paths)}`,
  );

  return { pageFilesList, serverFilesList };
}

function sha1Short(content: crypto.BinaryLike) {
  return crypto.createHash("sha1").update(content).digest("hex").slice(0, 20);
}

async function genFileHash(filepath: string): Promise<string> {
  const content = await fs.promises.readFile(filepath);
  return sha1Short(content);
}

async function genPublicFileMap() {
  const srcPath = nodePath.resolve("./public");

  const filemap: { [original: string]: string } = {};
  const reverseFilemap: { [hashed: string]: string } = {};

  async function traverse(srcDir: string): Promise<void> {
    const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });

    const tasks: Promise<void>[] = entries.map(async (entry) => {
      const srcEntry = nodePath.join(srcDir, entry.name);
      const relativeEntry = nodePath.join(
        "public",
        nodePath.relative(srcPath, srcEntry),
      );

      if (entry.isDirectory()) {
        return traverse(srcEntry);
      } else {
        const hash = await genFileHash(srcEntry);
        const extname = nodePath.extname(entry.name);
        const hashedFilename = `${hash}${extname}`;
        const hashedRelativePath = nodePath.join(
          "public",
          nodePath.relative(
            srcPath,
            srcEntry.replace(entry.name, hashedFilename),
          ),
        );
        filemap[relativeEntry] = hashedRelativePath;
        reverseFilemap[hashedRelativePath] = relativeEntry;
      }
    });

    await Promise.all(tasks);
  }

  await traverse(srcPath);

  const mapFilepath = nodePath.resolve("./dist/public-map.js");
  const reverseMapFilepath = nodePath.resolve("./dist/public-reverse-map.js");

  await Promise.all([
    fs.promises.writeFile(
      mapFilepath,
      `export const ${HWY_GLOBAL_KEYS.publicMap} = ${JSON.stringify(filemap)};`,
      "utf-8",
    ),
    fs.promises.writeFile(
      reverseMapFilepath,
      `export const ${HWY_GLOBAL_KEYS.publicReverseMap} = ${JSON.stringify(
        reverseFilemap,
      )};`,
      "utf-8",
    ),
  ]);
}

export { genPublicFileMap, sha1Short, writePathsToDisk };
export type Paths = Awaited<ReturnType<typeof walkPages>>["paths"];

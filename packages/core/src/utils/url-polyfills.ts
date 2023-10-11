let fileURLToPath: (url: string | URL) => string;
let pathToFileURL: (path: string) => URL;

try {
  const node_url = await import("node:url");
  fileURLToPath = node_url.fileURLToPath;
  pathToFileURL = node_url.pathToFileURL;
} catch {}

/*
 * These are used to provide a single point where we can
 * make adjustments for potential runtimes that do not
 * have `node:url` polyfilled.
 */

function file_url_to_path(url: string | URL): string {
  if (!url) {
    return "";
  }

  if (!fileURLToPath) {
    return typeof url === "string" ? url : url.href;
  }

  return fileURLToPath(url);
}

function path_to_file_url_string(path: string): string {
  console.log("path_to_file_url", path);

  if (!pathToFileURL) {
    return path || "";
  }

  return pathToFileURL(path).href;
}

export { file_url_to_path, path_to_file_url_string };

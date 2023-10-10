import { pathToFileURL, fileURLToPath } from "node:url";

/*
 * These are used to provide a single point where we can
 * make adjustments for potential runtimes that do not
 * have `node:url` polyfilled.
 */

function file_url_to_path(url: string | URL): string {
  return fileURLToPath(url);
}

function path_to_file_url(path: string): URL {
  return pathToFileURL(path);
}

export { file_url_to_path, path_to_file_url };

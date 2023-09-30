import path from "node:path";
import { pathToFileURL } from "node:url";

async function get_hashed_public_url_low_level(url: string): Promise<string> {
  /*
   * NOTE: THIS FN IS DUPED IN "hwy" AND "@hwy-js/dev"
   * IF YOU UPDATE IT, UPDATE IT IN BOTH PLACES.
   * STILL NOT WORTH SPLITTING INTO A SEPARATE PKG.
   */

  const public_map_path = path.resolve("dist", "public-map.js");

  const public_map: Record<string, string> | undefined = (
    await import(pathToFileURL(public_map_path).href)
  ).default;

  let hashed_url: string | undefined;

  if (url.startsWith("/")) url = url.slice(1);
  if (url.startsWith("./")) url = url.slice(2);

  hashed_url = public_map?.[path.join("public", url)];

  if (!hashed_url) {
    throw new Error(`No hashed URL found for ${url}`);
  }

  return "/" + hashed_url;
}

export { get_hashed_public_url_low_level };

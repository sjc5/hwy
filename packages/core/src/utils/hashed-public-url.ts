import path from "node:path";
import { ROOT_DIRNAME } from "../setup.js";
import { pathToFileURL } from "node:url";

let public_map: Record<string, string> | undefined;
let reverse_public_map: Record<string, string> | undefined;

async function warm_public_file_maps() {
  if (!public_map) {
    const public_map_path = path.join(ROOT_DIRNAME, "public-map.js");

    public_map = (await import(pathToFileURL(public_map_path).href)).default;
  }

  if (!reverse_public_map) {
    const reverse_public_map_path = path.join(
      ROOT_DIRNAME,
      "public-reverse-map.js"
    );

    reverse_public_map = (
      await import(pathToFileURL(reverse_public_map_path).href)
    ).default;
  }
}

function getPublicUrl(url: string): string {
  /*
   * NOTE: THIS FN IS DUPED IN "hwy" AND "@hwy-js/dev"
   * IF YOU UPDATE IT, UPDATE IT IN BOTH PLACES.
   * STILL NOT WORTH SPLITTING INTO A SEPARATE PKG.
   */

  let hashed_url: string | undefined;

  if (url.startsWith("/")) url = url.slice(1);
  if (url.startsWith("./")) url = url.slice(2);

  hashed_url = public_map?.[path.join("public", url)];

  if (!hashed_url) {
    throw new Error(`No hashed URL found for ${url}`);
  }

  return "/" + hashed_url;
}

function get_original_public_url({
  hashed_url,
  public_url_prefix,
}: {
  hashed_url: string;
  public_url_prefix?: string;
}): string {
  const sliced_url = path.normalize(hashed_url.slice(1));

  const original_url = reverse_public_map?.[sliced_url];

  if (!original_url) {
    throw new Error(`No original URL found for ${sliced_url}`);
  }

  return "./" + (public_url_prefix ?? "") + original_url;
}

function get_serve_static_options({
  public_url_prefix,
}: {
  public_url_prefix?: string;
}) {
  return {
    rewriteRequestPath: (path: string) => {
      return get_original_public_url({
        hashed_url: path,
        public_url_prefix,
      });
    },
  };
}

export { getPublicUrl, get_serve_static_options, warm_public_file_maps };

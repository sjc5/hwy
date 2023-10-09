import path from "node:path";
import { PUBLIC_URL_PREFIX, ROOT_DIRNAME } from "../setup.js";
import { path_to_file_url } from "./url-polyfills.js";

let public_map: Record<string, string> | undefined;
let reverse_public_map: Record<string, string> | undefined;

async function warm_public_file_maps() {
  if (!public_map) {
    const public_map_path = path.join(ROOT_DIRNAME, "public-map.js");
    const _path = path_to_file_url(public_map_path).href;
    public_map = (await import(_path)).default;
  }

  if (!reverse_public_map) {
    const reverse_public_map_path = path.join(
      ROOT_DIRNAME,
      "public-reverse-map.js",
    );
    const _path = path_to_file_url(reverse_public_map_path).href;
    reverse_public_map = (await import(_path)).default;
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
}: {
  hashed_url: string;
}): string {
  const sliced_url = path.normalize(hashed_url.slice(1));

  const original_url = reverse_public_map?.[sliced_url];

  if (!original_url) {
    throw new Error(`No original URL found for ${sliced_url}`);
  }

  return "./" + PUBLIC_URL_PREFIX + original_url;
}

function get_serve_static_options() {
  return {
    rewriteRequestPath: (path: string) => {
      return get_original_public_url({
        hashed_url: path,
      });
    },
  };
}

export { getPublicUrl, get_serve_static_options, warm_public_file_maps };

import path from "node:path";
import { PUBLIC_URL_PREFIX } from "../setup.js";

function getPublicUrl(url: string): string {
  let hashed_url: string | undefined;

  if (url.startsWith("/")) url = url.slice(1);
  if (url.startsWith("./")) url = url.slice(2);

  const public_map: Record<string, string> | undefined = (globalThis as any)
    .__hwy__public_map;

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

  const reverse_public_map: Record<string, string> | undefined = (
    globalThis as any
  ).__hwy__public_reverse_map;

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

export { getPublicUrl, get_serve_static_options };

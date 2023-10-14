import path from "node:path";

function get_hashed_public_url_low_level({
  public_map,
  url,
}: {
  public_map: Record<string, string>;
  url: string;
}): string {
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

import { get_hwy_config } from "./get-hwy-config.js";

async function smart_normalize(str: string) {
  const hwy_config = await get_hwy_config();
  if (
    hwy_config.deploymentTarget === "cloudflare-pages" &&
    process.platform === "win32"
  ) {
    return str.replace(/\\\\/g, "/").replace(/\\/g, "/");
  }

  return str;
}

export { smart_normalize };

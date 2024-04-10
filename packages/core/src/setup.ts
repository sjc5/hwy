import { getHwyGlobal } from "../../common/index.mjs";
import { getOrigPublicURL, getPublicURL } from "./hashed_public_url.js";
import { HeadBlock } from "./router.js";
import { dynamicFileURLToPath, dynamicNodePath } from "./url-polyfills.js";

const hwyGlobal = getHwyGlobal();

export async function initHwy({
  importMetaURL,
  defaultHeadBlocks,
}: {
  importMetaURL?: string;
  defaultHeadBlocks?: Array<HeadBlock>;
}) {
  console.log("Initializing Hwy app");

  hwyGlobal.set("getPublicURL", getPublicURL);
  hwyGlobal.set("getOrigPublicURL", getOrigPublicURL);
  hwyGlobal.set("defaultHeadBlocks", defaultHeadBlocks ?? []);
  hwyGlobal.set(
    "rootDirname",
    dynamicNodePath?.dirname(dynamicFileURLToPath(importMetaURL)) ?? "",
  );

  if (hwyGlobal.get("isDev")) {
    const { setupLiveRefreshEndpoints } = await import("@hwy-js/dev" as any);
    setupLiveRefreshEndpoints();
  }
}

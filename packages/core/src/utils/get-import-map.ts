import { getPublicUrl } from "../utils/hashed-public-url.js";
import { get_hwy_global } from "../utils/get-hwy-global.js";

const hwy_global = get_hwy_global();

let IMPORT_MAP: { imports: Record<string, string> };

function getImportMap() {
  if (!IMPORT_MAP) {
    IMPORT_MAP = {
      imports: {
        ...Object.fromEntries(
          (hwy_global.get("import_map_setup") || []).map((x: any) => {
            return [x.name, getPublicUrl(`dist/${x.index}.js`)];
          }),
        ),
        ...(hwy_global.get("is_dev")
          ? {
              "preact/debug": getPublicUrl(
                "dist/preact/preact-dev/debug.module.js",
              ),
              "preact/devtools": getPublicUrl(
                "dist/preact/preact-dev/devtools.module.js",
              ),
            }
          : {}),
      },
    };
  }

  return IMPORT_MAP;
}

export { getImportMap };

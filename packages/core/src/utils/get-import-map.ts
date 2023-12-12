import { utils } from "./hwy-utils.js";
import { get_hwy_global } from "../../../common/index.mjs";

const hwy_global = get_hwy_global();

let IMPORT_MAP: { imports: Record<string, string> };

function getImportMap() {
  if (!IMPORT_MAP) {
    IMPORT_MAP = {
      imports: {
        ...Object.fromEntries(
          (hwy_global.get("import_map_setup") || []).map((x: any) => {
            return [x.name, utils.getPublicUrl(`dist/${x.index}.js`)];
          }),
        ),
        ...(hwy_global.get("is_dev")
          ? {
              "preact/debug": utils.getPublicUrl(
                "dist/preact/preact-dev/debug.module.js",
              ),
              "preact/devtools": utils.getPublicUrl(
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

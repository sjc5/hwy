import type { getMatchingPathData } from "../router/get-matching-path-data.js";
import { getPublicUrl } from "../utils/hashed-public-url.js";
import { utils } from "../utils/hwy-utils.js";
import { client_signal_keys, get_hwy_global } from "../utils/get-hwy-global.js";
import { uneval } from "devalue";
import { HWY_PREFIX } from "../../../common/index.mjs";

const hwy_global = get_hwy_global();

function global_setter_string(
  key: (typeof client_signal_keys)[number],
  value: any,
) {
  return `globalThis.${HWY_PREFIX}.${key}=${uneval(value)};`;
}

function ClientScripts({
  entryStrategy = "defer",
  pageStrategy = "defer",
  activePathData,
}: {
  entryStrategy?: "defer" | "async";
  pageStrategy?: "defer" | "async";
  activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
}) {
  const IS_PREACT = hwy_global.get("mode") === "preact-mpa";

  console.log({ IS_PREACT });

  const USE_PREACT_COMPAT = false; // TODO

  return (
    <>
      {IS_PREACT && (
        <>
          <script
            type="importmap"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                imports: {
                  hwy: getPublicUrl("dist/hwy.js"),
                  "@preact/signals": getPublicUrl("dist/hwy.js"),
                  preact: getPublicUrl("dist/preact/preact.js"),
                  "preact/hooks": getPublicUrl("dist/preact/preact.js"),
                  "preact/jsx-runtime": getPublicUrl("dist/preact/preact.js"),
                  ...(USE_PREACT_COMPAT
                    ? {
                        "preact/compat": getPublicUrl(
                          "dist/preact/preact-compat.js",
                        ),
                      }
                    : {}),
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
              }),
            }}
          />

          <link
            rel="modulepreload"
            href={getPublicUrl("dist/preact/preact.js")}
          />

          <script
            type="module"
            dangerouslySetInnerHTML={{
              __html: `${
                hwy_global.get("is_dev") ? `import "preact/debug";` : ""
              }
globalThis.${HWY_PREFIX} = {};
globalThis.${HWY_PREFIX}.is_dev = ${uneval(hwy_global.get("is_dev"))};
${global_setter_string("activeData", activePathData.activeData)}
${global_setter_string(
  "activePaths",
  activePathData.matchingPaths?.map((x) => {
    return getPublicUrl("dist/" + x.importPath.slice(0, -3) + ".hydrate.js");
  }),
)}
${global_setter_string(
  "outermostErrorBoundaryIndex",
  activePathData.outermostErrorBoundaryIndex,
)}
${global_setter_string("errorToRender", activePathData.errorToRender)}
${global_setter_string("splatSegments", activePathData.splatSegments)}
${global_setter_string("params", activePathData.params)}
${global_setter_string("actionData", activePathData.actionData)}
      `.trim(),
            }}
          />
        </>
      )}

      <script
        type={IS_PREACT ? "module" : undefined}
        src={utils.getClientEntryUrl()}
        {...{ [entryStrategy]: true }}
      />

      {activePathData.matchingPaths
        ?.filter((x) => {
          return x.hasSiblingClientFile;
        })
        .map((x) => {
          return (
            <script
              type={IS_PREACT ? "module" : undefined}
              src={getPublicUrl(
                "dist/pages/" + x.importPath.replace("pages/", ""),
              )}
              {...{ [pageStrategy]: true }}
            />
          );
        })}
    </>
  );
}

export { ClientScripts };

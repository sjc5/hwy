import type { getMatchingPathData } from "../router/get-matching-path-data.js";
import { getPublicUrl } from "../utils/hashed-public-url.js";
import { utils } from "../utils/hwy-utils.js";
import { get_hwy_global } from "../utils/get-hwy-global.js";
import { uneval } from "devalue";
import { HWY_PREFIX, type CLIENT_SIGNAL_KEYS } from "../../../common/index.mjs";

const hwy_global = get_hwy_global();

function global_setter_string(
  key: (typeof CLIENT_SIGNAL_KEYS)[number],
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
                  "@hwy-js/client": getPublicUrl("dist/hwy-client.js"),
                  "@preact/signals": getPublicUrl("dist/preact-signals.js"),
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
        type="module"
        src={utils.getClientEntryUrl()}
        {...{ [entryStrategy]: true }}
      />

      {/* `.client.` does not work with Preact, just use a useEffect in your actual client component */}
      {!IS_PREACT &&
        activePathData.matchingPaths
          ?.filter((x) => {
            return x.hasSiblingClientFile;
          })
          .map((x) => {
            return (
              <script
                type={"module"}
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

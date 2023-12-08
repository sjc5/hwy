import type { getMatchingPathData } from "../router/get-matching-path-data.js";
import { getPublicUrl } from "../utils/hashed-public-url.js";
import { utils } from "../utils/hwy-utils.js";
import { get_hwy_global } from "../utils/get-hwy-global.js";
import { uneval } from "devalue";

const hwy_global = get_hwy_global();

function ClientScripts({
  entryStrategy = "defer",
  pageStrategy = "defer",
  activePathData,
}: {
  entryStrategy?: "defer" | "async";
  pageStrategy?: "defer" | "async";
  activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
}) {
  const IS_PREACT = hwy_global.get("client_lib") === "preact";

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
                  preact: getPublicUrl("dist/preact.js"),
                  "preact/hooks": getPublicUrl("dist/preact.js"),
                  "preact/jsx-runtime": getPublicUrl("dist/preact.js"),
                  ...(USE_PREACT_COMPAT
                    ? { "preact/compat": getPublicUrl("dist/preact-compat.js") }
                    : {}),
                  ...(hwy_global.get("is_dev")
                    ? {
                        "preact/debug": getPublicUrl(
                          "dist/preact-dev/debug.module.js",
                        ),
                        "preact/devtools": getPublicUrl(
                          "dist/preact-dev/devtools.module.js",
                        ),
                      }
                    : {}),
                },
              }),
            }}
          />

          <link rel="modulepreload" href={getPublicUrl("dist/preact.js")} />

          <script
            type="module"
            dangerouslySetInnerHTML={{
              __html: `${
                hwy_global.get("is_dev") ? `import "preact/debug";` : ""
              }
globalThis.__hwy__ = {};
globalThis.__hwy__.is_dev = ${uneval(hwy_global.get("is_dev"))};
globalThis.__hwy__.active_data = ${uneval(activePathData.activeData)};
globalThis.__hwy__.active_paths = ${uneval(
                activePathData.matchingPaths?.map((x) => {
                  return getPublicUrl(
                    "dist/" + x.importPath.slice(0, -3) + ".hydrate.js",
                  );
                }),
              )};
globalThis.__hwy__.outermost_error_boundary_index = ${uneval(
                activePathData.outermostErrorBoundaryIndex,
              )};
globalThis.__hwy__.error_to_render = ${uneval(activePathData.errorToRender)};
globalThis.__hwy__.splat_segments = ${uneval(activePathData.splatSegments)};
globalThis.__hwy__.params = ${uneval(activePathData.params)};
globalThis.__hwy__.action_data = ${uneval(activePathData.actionData)};
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

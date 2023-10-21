import type { getMatchingPathData } from "../router/get-matching-path-data.js";
import { getPublicUrl } from "../utils/hashed-public-url.js";

function ClientScripts({
  entryStrategy = "defer",
  pageStrategy = "defer",
  activePathData,
}: {
  entryStrategy?: "defer" | "async";
  pageStrategy?: "defer" | "async";
  activePathData: Awaited<ReturnType<typeof getMatchingPathData>>;
}) {
  return (
    <>
      <script
        src={getPublicUrl("dist/client.entry.js")}
        {...{ [entryStrategy]: true }}
      />

      {activePathData.matchingPaths
        ?.filter((x) => {
          return x.hasSiblingClientFile;
        })
        .map((x) => {
          return (
            <script
              key={x.path}
              src={getPublicUrl("dist/pages/" + x.fileRefFromPagesDirWithJsExt)}
              {...{ [pageStrategy]: true }}
            />
          );
        })}
    </>
  );
}

export { ClientScripts };

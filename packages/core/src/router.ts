import {
  AdHocData,
  CLIENT_GLOBAL_KEYS,
  CRITICAL_CSS_ELEMENT_ID,
  HWY_PREFIX,
  LIVE_REFRESH_SSE_PATH,
  getHwyGlobal,
} from "../../common/index.mjs";
import { DEV_BUNDLED_CSS_LINK, getPublicUrl } from "./hashed-public-url.js";
import { LRUCache } from "./lru_cache.js";
import { ROOT_DIRNAME } from "./setup.js";
import { dynamicNodePath, pathToFileURLStr } from "./url-polyfills.js";

const hwyGlobal = getHwyGlobal();

export const SPLAT_SEGMENT = ":catch*";

export type PathType =
  | "ultimate-catch"
  | "index"
  | "static-layout"
  | "dynamic-layout"
  | "non-ultimate-splat";

// DIFFERENT FROM GO
export type Path = {
  pattern: string;
  segments: Array<string>;
  pathType: PathType;
  importPath: string;
  hasSiblingServerFile: boolean;
  isServerFile: boolean;
};

export type TitleHeadBlock = { title: string };
export type OtherHeadBlock = {
  tag: "meta" | "base" | "link" | "style" | "script" | "noscript" | string;
  attributes: Record<string, string | undefined>;
};
export type HeadBlock = TitleHeadBlock | OtherHeadBlock;

type DataProps = {
  request: Request;
  params: Record<string, string>;
  splatSegments: Array<string>;
};

type HeadProps = {
  dataProps: DataProps;
  loaderData: any;
  actionData: any;
};

// __TODO
type Action = (DataProps: DataProps) => Promise<any>;
type Head = (HeadProps: HeadProps) => Array<HeadBlock>;

export type ActivePathData = {
  matchingPaths: Array<DecoratedPath>;
  loadersData: Array<any>;
  activePaths: Array<string>;
  outermostErrorBoundaryIndex: number;
  actionData: Array<any>;
  activeHeads: Array<Head | null>;
  splatSegments: Array<string>;
  params: Record<string, string>;
  activeComponents: Array<any>;
  activeErrorBoundaries: Array<any>;
};

type MatcherOutput = {
  path: string;
  pattern: string;
  matches: boolean;
  params: Record<string, string>;
  score: number;
  realSegmentLeangth: number;
};

type GroupedBySegmentLength = Record<number, Array<MatchingPath>>;

type MatchStrength = {
  score: number;
  realSegmentsLength: number;
};

type MatchingPath = {
  score: number;
  realSegmentsLength: number;
  segments: Array<string>;
  pathType: PathType;
  params: Record<string, string>;
  pattern: string;
  importPath: string;
  hasSiblingServerFile: boolean;
  isServerFile: boolean;
};

type DecoratedPath = {
  hasSiblingServerFile: boolean;
  isServerFile: boolean;
  importPath: string;
  params: Record<string, string>;
  pathType: PathType;
  componentImporter: () => Promise<any>;
  errorBoundaryImporter: () => Promise<any>;
  headImporter: () => Promise<any>;
  loader: (loaderArgs: DataProps) => Promise<any>;
  action: (actionArgs: DataProps) => Promise<any>;
};

type gmpdItem = {
  splatSegments: Array<string>;
  params: Record<string, string>;
  decoratedMatchingPaths: Array<DecoratedPath>;
  activePaths: Array<string>;
};

export type GetRouteDataOutput = {
  title: string;
  metaHeadBlocks: Array<OtherHeadBlock>;
  restHeadBlocks: Array<OtherHeadBlock>;
  loadersData: Array<any>;
  activePaths: Array<string>;
  outermostErrorBoundaryIndex: number;
  splatSegments: Array<string>;
  params: Record<string, string>;
  actionData: Array<any>;
  adHocData: Record<string, any>;
  buildID: string;

  // SSR Only
  activeErrorBoundaries: Array<any> | null;
  activeComponents: Array<any> | null;
};

function getInitialMatchingPaths(pathToUse: string): Array<MatchingPath> {
  let initialMatchingPaths: Array<MatchingPath> = [];

  for (const path of getHwyGlobal().get("paths")) {
    let pathType = path.pathType;
    if (path.pattern === "/" + SPLAT_SEGMENT) {
      pathType = "ultimate-catch";
    }
    const matcherOutput = matcher(path.pattern, pathToUse);
    if (matcherOutput.matches) {
      initialMatchingPaths.push({
        score: matcherOutput.score,
        realSegmentsLength: matcherOutput.realSegmentLeangth,
        pathType,
        importPath: path.importPath,
        hasSiblingServerFile: path.hasSiblingServerFile,
        isServerFile: path.isServerFile,
        pattern: path.pattern,
        segments: path.segments,
        params: matcherOutput.params,
      });
    }
  }

  return initialMatchingPaths;
}

async function getPath(importPath: string) {
  const arbitraryGlobal = (globalThis as any)[Symbol.for(HWY_PREFIX)];

  if (!arbitraryGlobal) {
    (globalThis as any)[Symbol.for(HWY_PREFIX)] = {};
  }

  let localPath = arbitraryGlobal["./" + importPath];

  // If "bundle" this should definitely be true
  // If "warm-cache-at-startup" or "lazy-once-then-cache", this might be true
  // If "always-lazy", this should definitely be false
  if (localPath) {
    return localPath;
  }

  const inner = dynamicNodePath?.join(
    hwyGlobal.get("testDirname") || ROOT_DIRNAME || "./",
    importPath,
  );

  if (hwyGlobal.get("hwyConfig").routeStrategy === "always-lazy") {
    return import(pathToFileURLStr(inner));
  }

  localPath = await import(pathToFileURLStr(inner));

  arbitraryGlobal["./" + importPath] = localPath;

  return localPath;
}

function decoratePaths(
  matchingPaths: Array<MatchingPath>,
): Array<DecoratedPath> {
  return (
    matchingPaths?.map((localPath) => {
      const serverImportPath = !localPath.isServerFile
        ? localPath.importPath.replace(".page.js", ".server.js")
        : localPath.importPath;

      const noServerFns =
        !localPath.hasSiblingServerFile && !localPath.isServerFile;

      // public
      return {
        hasSiblingServerFile: localPath.hasSiblingServerFile,
        isServerFile: localPath.isServerFile,
        importPath: localPath.importPath,
        params: localPath.params,
        pathType: localPath.pathType,

        // ON CLIENT
        componentImporter: async () => {
          if (localPath.isServerFile) return;

          try {
            const imported = await getPath(localPath.importPath);
            return imported.default;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        errorBoundaryImporter: async () => {
          if (localPath.isServerFile) return;

          try {
            const imported = await getPath(localPath.importPath);
            return imported.errorBoundary ? imported.errorBoundary : undefined;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        // REST ON SERVER
        headImporter: async () => {
          if (noServerFns) return () => [];

          try {
            const imported = await getPath(serverImportPath);
            return imported.head ? imported.head : () => [];
          } catch (e) {
            console.error(e);
            throw e;
          }
        },

        loader: async (loaderArgs: DataProps) => {
          if (noServerFns) return;

          try {
            const imported = await getPath(serverImportPath);
            return imported.loader ? imported.loader(loaderArgs) : undefined;
          } catch (e) {
            return handleCaughtMaybeResponse(e);
          }
        },

        action: async (actionArgs: DataProps) => {
          if (noServerFns) return;

          try {
            const imported = await getPath(serverImportPath);
            return imported.action ? imported.action(actionArgs) : undefined;
          } catch (e) {
            return handleCaughtMaybeResponse(e);
          }
        },
      } satisfies DecoratedPath;
    }) ?? []
  );
}

function handleCaughtMaybeResponse(e: any) {
  if (e instanceof Response) {
    return e;
  }
  console.error(e);
  throw e;
}

function getMatchStrength(pattern: string, path: string): MatchStrength {
  const patternSegments: Array<string> = [];
  for (const segment of pattern.split("/")) {
    if (segment !== "") {
      patternSegments.push(segment);
    }
  }
  const realSegments: Array<string> = [];
  for (const segment of path.split("/")) {
    if (segment !== "") {
      realSegments.push(segment);
    }
  }
  let score = 0;
  for (let i = 0; i < patternSegments.length; i++) {
    if (
      realSegments.length >= patternSegments.length &&
      patternSegments[i] === realSegments[i]
    ) {
      score += 3;
      continue;
    }
    if (patternSegments[i] === SPLAT_SEGMENT) {
      score += 1;
      continue;
    }
    if (patternSegments[i].startsWith(":")) {
      score += 2;
      continue;
    }
    break;
  }
  return { score: score, realSegmentsLength: realSegments.length };
}

type GetMatchingPathsInternalOutput = {
  splatSegments: Array<string>;
  maybeFinalPaths: Array<MatchingPath>;
};

function getMatchingPathsInternal(
  pathsArg: Array<MatchingPath>,
  realPath: string,
): GetMatchingPathsInternalOutput {
  let paths: Array<MatchingPath> = [];
  for (const x of pathsArg) {
    // if it's dash route (home), no need to compare segments length
    if (x.realSegmentsLength === 0) {
      paths.push(x);
      continue;
    }

    let indexAdjustedRealSegmentsLength = 0;
    if (x.pathType === "index") {
      indexAdjustedRealSegmentsLength = x.realSegmentsLength + 1;
    } else {
      indexAdjustedRealSegmentsLength = x.realSegmentsLength;
    }

    // make sure any remaining matches are not longer than the path itself
    const shouldMoveOn = x.segments.length <= indexAdjustedRealSegmentsLength;
    if (!shouldMoveOn) {
      continue;
    }

    // now we need to remove ineligible indices
    if (x.pathType !== "index") {
      // if not an index, then you're already confirmed good
      paths.push(x);
      continue;
    }

    const truthySegments: Array<string> = [];
    for (const segment of x.segments) {
      if (segment !== "") {
        truthySegments.push(segment);
      }
    }
    const pathSegments: Array<string> = [];
    for (const segment of realPath.split("/")) {
      if (segment !== "") {
        pathSegments.push(segment);
      }
    }
    if (truthySegments.length === pathSegments.length) {
      paths.push(x);
    }
  }

  // if there are multiple matches, filter out the ultimate catch-all
  if (paths.length > 1) {
    const nonUltimateCatchPaths: Array<MatchingPath> = [];
    for (const x of paths) {
      if (x.pathType !== "ultimate-catch") {
        nonUltimateCatchPaths.push(x);
      }
    }
    paths = nonUltimateCatchPaths;
  }

  let splatSegments: Array<string> = [];

  // if only one match now, return it
  if (paths.length === 1) {
    if (paths[0].pathType === "ultimate-catch") {
      splatSegments = getBaseSplatSegments(realPath);
    }
    return { splatSegments, maybeFinalPaths: paths };
  }

  // now we only have real child paths

  // these are essentially any matching static layout routes
  const definiteMatches: Array<MatchingPath> = [];
  for (const x of paths) {
    if (x.pathType === "static-layout") {
      definiteMatches.push(x);
    }
  }

  const highestScoresBySegmentLengthOfDefiniteMatches =
    getHighestScoresBySegmentLength(definiteMatches);

  // the "maybe matches" need to compete with each other
  // they also need some more complicated logic

  const groupedBySegmentLength: GroupedBySegmentLength = {};

  for (const x of paths) {
    if (x.pathType !== "static-layout") {
      const segmentLength = x.segments.length;

      const highestScoreForThisSegmentLength =
        highestScoresBySegmentLengthOfDefiniteMatches[segmentLength];
      const exists = highestScoreForThisSegmentLength !== undefined;

      if (!exists || x.score > highestScoreForThisSegmentLength) {
        if (groupedBySegmentLength[segmentLength] === undefined) {
          groupedBySegmentLength[segmentLength] = [];
        }
        groupedBySegmentLength[segmentLength].push(x);
      }
    }
  }

  const sortedGroupedBySegmentLength = getSortedGroupedBySegmentLength(
    groupedBySegmentLength,
  );

  const xformedMaybes: Array<MatchingPath> = [];
  let wildcardSplat: MatchingPath | null = null;
  for (const paths of sortedGroupedBySegmentLength) {
    let winner = paths[0];
    let highestScore = winner.score;
    let indexCandidate: MatchingPath | null = null;

    for (const path of paths) {
      if (
        path.pathType === "index" &&
        path.realSegmentsLength < path.segments.length
      ) {
        if (indexCandidate === null) {
          indexCandidate = path;
        } else {
          if (path.score > indexCandidate.score) {
            indexCandidate = path;
          }
        }
      }
      if (path.score > highestScore) {
        highestScore = path.score;
        winner = path;
      }
    }

    if (indexCandidate !== null) {
      winner = indexCandidate;
    }

    // find non ultimate splat
    const splat = findNonUltimateSplat(paths);

    if (splat !== null) {
      if (wildcardSplat === null || splat.score > wildcardSplat.score) {
        wildcardSplat = splat;
      }

      splatSegments = getSplatSegmentsFromWinningPath(winner, realPath);
    }

    // ok, problem
    // in the situation where we have a dynamic folder name with an index file within,
    // we need to make sure that other static-layout paths win over it
    // that's what this code is for

    const winnerIsDynamicIndex = getWinnerIsDynamicIndex(winner);

    let definiteMatchesShouldOverride = false;
    if (winnerIsDynamicIndex) {
      for (const x of definiteMatches) {
        const a = x.pathType === "static-layout";
        const b = x.realSegmentsLength === winner.realSegmentsLength;
        let c = false;
        if (x.segments.length >= 1 && winner.segments.length >= 2) {
          const lastSegmentOfX = x.segments[x.segments.length - 1];
          const secondToLastSegmentOfWinner =
            winner.segments[winner.segments.length - 2];
          c = lastSegmentOfX !== secondToLastSegmentOfWinner;
        }
        const d = x.score > winner.score;
        if (a && b && c && d) {
          definiteMatchesShouldOverride = true;
          break;
        }
      }
    }

    if (!definiteMatchesShouldOverride) {
      xformedMaybes.push(winner);
    }
  }

  const maybeFinalPaths = getMaybeFinalPaths(definiteMatches, xformedMaybes);

  if (maybeFinalPaths.length > 0) {
    const lastPath = maybeFinalPaths[maybeFinalPaths.length - 1];

    // get index-adjusted segments length
    let lastPathSegmentsLengthConstructive = 0;
    if (lastPath.pathType === "index") {
      lastPathSegmentsLengthConstructive = lastPath.segments.length - 1;
    } else {
      lastPathSegmentsLengthConstructive = lastPath.segments.length;
    }

    const splatIsTooFarOut =
      lastPathSegmentsLengthConstructive > lastPath.realSegmentsLength;
    const splatIsNeeded =
      lastPathSegmentsLengthConstructive < lastPath.realSegmentsLength;
    const isNotASplat = lastPath.pathType !== "non-ultimate-splat";
    const weNeedADifferentSplat =
      splatIsTooFarOut || (splatIsNeeded && isNotASplat);

    if (weNeedADifferentSplat) {
      if (wildcardSplat !== null) {
        maybeFinalPaths[maybeFinalPaths.length - 1] = wildcardSplat;
        splatSegments = getSplatSegmentsFromWinningPath(
          wildcardSplat,
          realPath,
        );
      } else {
        splatSegments = getBaseSplatSegments(realPath);
        const filteredPaths: Array<MatchingPath> = [];
        for (const x of pathsArg) {
          if (x.pathType === "ultimate-catch") {
            filteredPaths.push(x);
            break;
          }
        }
        return { splatSegments, maybeFinalPaths: filteredPaths };
      }
    }
  }

  // if a dynamic layout is adjacent and before an index, we need to remove it
  // IF the index does not share the same dynamic segment
  for (let i = 0; i < maybeFinalPaths.length; i++) {
    const current = maybeFinalPaths[i];
    let next: MatchingPath | null = null;
    if (i + 1 < maybeFinalPaths.length) {
      next = maybeFinalPaths[i + 1];
    }

    if (
      current.pathType === "dynamic-layout" &&
      next &&
      next.pathType === "index"
    ) {
      const currentDynamicSegment =
        current.segments[current.segments.length - 1];
      const nextDynamicSegment = next.segments[next.segments.length - 2];
      if (currentDynamicSegment !== nextDynamicSegment) {
        maybeFinalPaths.splice(i, 1);
        i--;
      }
    }
  }

  return { splatSegments, maybeFinalPaths };
}

function findNonUltimateSplat(paths: Array<MatchingPath>): MatchingPath | null {
  for (const path of paths) {
    if (path.pathType === "non-ultimate-splat") {
      return path;
    }
  }
  return null;
}

function getSortedGroupedBySegmentLength(
  groupedBySegmentLength: GroupedBySegmentLength,
): Array<Array<MatchingPath>> {
  const keys = Object.keys(groupedBySegmentLength).map((x) => parseInt(x));

  // Sort the keys in ascending order
  keys.sort((a, b) => a - b);

  const sortedGroupedBySegmentLength: Array<Array<MatchingPath>> = [];
  for (const k of keys) {
    sortedGroupedBySegmentLength.push(groupedBySegmentLength[k]);
  }

  return sortedGroupedBySegmentLength;
}

function getHighestScoresBySegmentLength(
  matches: Array<MatchingPath>,
): Record<number, number> {
  const highestScores: Record<number, number> = {};
  for (const match of matches) {
    const segmentLength = match.segments.length;
    const currentScore = highestScores[segmentLength];
    const exists = currentScore !== undefined;
    if (!exists || match.score > currentScore) {
      highestScores[segmentLength] = match.score;
    }
  }
  return highestScores;
}

function getSplatSegmentsFromWinningPath(
  winner: MatchingPath,
  realPath: string,
): Array<string> {
  const filteredData = realPath.split("/").filter((x) => x !== "");

  let numOfNonSplatSegments = 0;
  for (const x of winner.segments) {
    if (x !== SPLAT_SEGMENT) {
      numOfNonSplatSegments++;
    }
  }

  const numOfSplatSegments = filteredData.length - numOfNonSplatSegments;
  if (numOfSplatSegments > 0) {
    return filteredData.slice(filteredData.length - numOfSplatSegments);
  } else {
    return [];
  }
}

function getWinnerIsDynamicIndex(winner: MatchingPath): boolean {
  const segmentsLength = winner.segments.length;
  if (winner.pathType === "index" && segmentsLength >= 2) {
    const secondToLastSegment = winner.segments[segmentsLength - 2];
    return secondToLastSegment.startsWith(":");
  }
  return false;
}

function getMaybeFinalPaths(
  definiteMatches: Array<MatchingPath>,
  xformedMaybes: Array<MatchingPath>,
): Array<MatchingPath> {
  const maybeFinalPaths = [...definiteMatches, ...xformedMaybes];
  maybeFinalPaths.sort((a, b) => {
    return a.segments.length - b.segments.length;
  });
  return maybeFinalPaths;
}

function getBaseSplatSegments(realPath: string): Array<string> {
  return realPath.split("/").filter((x) => x !== "");
}

const gmpdCache = new LRUCache<gmpdItem>(500_000);

export async function getMatchingPathData(request: Request): Promise<{
  activePathData: ActivePathData | null;
  response: Response | null;
}> {
  let realPath = new URL(request.url).pathname;
  if (realPath !== "/" && realPath.endsWith("/")) {
    realPath = realPath.slice(0, realPath.length - 1);
  }

  const cached = gmpdCache.get(realPath);
  const ok = cached !== undefined;
  let item: gmpdItem;
  if (ok) {
    item = cached;
  } else {
    const initialMatchingPaths = getInitialMatchingPaths(realPath);
    const { splatSegments, maybeFinalPaths: matchingPaths } =
      getMatchingPathsInternal(initialMatchingPaths, realPath);
    const activePaths: Array<string> = [];
    for (const path of matchingPaths) {
      activePaths.push(getPublicUrl("./dist/" + path.importPath));
    }
    const lastPath =
      matchingPaths.length > 0 ? matchingPaths[matchingPaths.length - 1] : null;
    item = {
      activePaths: activePaths,
      decoratedMatchingPaths: decoratePaths(matchingPaths),
      splatSegments: splatSegments,
      params: lastPath ? lastPath.params : {},
    };
    const isSpam = matchingPaths.length === 0;
    gmpdCache.set(realPath, item, isSpam);
  }

  let lastPath: DecoratedPath | null = null;
  if (item.decoratedMatchingPaths.length > 0) {
    lastPath =
      item.decoratedMatchingPaths[item.decoratedMatchingPaths.length - 1];
  }

  const { data: actionData, error: actionDataError } = await getActionData(
    request,
    lastPath?.action,
    item.params,
    item.splatSegments,
  );

  // __TODO test this (returning a redirect response from an action)
  if (actionData instanceof Response && lastPath?.isServerFile) {
    return { response: actionData, activePathData: null };
  }

  let [activeComponents, activeHeads, activeErrorBoundaries] =
    await Promise.all([
      Promise.all(
        item.decoratedMatchingPaths.map((path) => {
          return path?.componentImporter();
        }),
      ),

      Promise.all(
        item.decoratedMatchingPaths.map((path) => {
          return path.headImporter();
        }),
      ),

      Promise.all(
        item.decoratedMatchingPaths.map((path) => {
          return path?.errorBoundaryImporter();
        }),
      ),
    ]);

  const loadersData: Array<any> = [];
  const loadersErrors: Array<Error | null> = [];

  await Promise.all(
    item.decoratedMatchingPaths.map(async (path, i) => {
      if (!path.loader) {
        loadersData[i] = null;
        loadersData[i] = null;
        return;
      }
      try {
        const data = await path.loader({
          request,
          params: item.params,
          splatSegments: item.splatSegments,
        });
        loadersData[i] = data;
        loadersErrors[i] = null;
      } catch (e) {
        loadersData[i] = null;
        loadersErrors[i] = e instanceof Error ? e : new Error("Unknown");
      }
    }),
  );

  // __TODO test this (returning a redirect response from a loader)
  for (let i = loadersData.length - 1; i >= 0; i--) {
    if (loadersData[i] instanceof Response) {
      return { response: loadersData[i], activePathData: null };
    }
  }

  let thereAreErrors = false;
  let outermostErrorIndex = -1;
  for (let i = 0; i < loadersErrors.length; i++) {
    if (loadersErrors[i] !== null) {
      thereAreErrors = true;
      outermostErrorIndex = i;
      break;
    }
  }

  if (actionDataError) {
    thereAreErrors = true; // __TODO test this
    const actionDataErrorIndex = loadersData.length - 1;
    if (thereAreErrors && actionDataErrorIndex < outermostErrorIndex) {
      outermostErrorIndex = actionDataErrorIndex;
    }
  }

  let closestParentErrorBoundaryIndex = -2;

  if (thereAreErrors && outermostErrorIndex !== -1) {
    closestParentErrorBoundaryIndex = findClosestParentErrorBoundaryIndex(
      loadersData,
      outermostErrorIndex,
    );

    if (closestParentErrorBoundaryIndex !== -1) {
      closestParentErrorBoundaryIndex =
        outermostErrorIndex - closestParentErrorBoundaryIndex;

      activeComponents = [
        ...activeComponents.slice(0, closestParentErrorBoundaryIndex),
        activeErrorBoundaries[closestParentErrorBoundaryIndex],
      ];
    }
  }

  const activePathData: ActivePathData = {
    matchingPaths: [],
    activeHeads: [],
    loadersData: [],
    activePaths: [],
    outermostErrorBoundaryIndex: -1,
    actionData: [],
    splatSegments: [],
    params: {},
    activeComponents: [],
    activeErrorBoundaries: [],
  };

  if (thereAreErrors) {
    const locMatchingPaths = item.decoratedMatchingPaths.slice(
      0,
      outermostErrorIndex + 1,
    );
    activePathData.matchingPaths = locMatchingPaths;
    const locActiveHeads = activeHeads.slice(0, outermostErrorIndex + 1);
    activePathData.activeHeads = locActiveHeads;
    const locLoadersData = loadersData.slice(0, outermostErrorIndex + 1);
    activePathData.loadersData = locLoadersData;
    const locActivePaths = item.activePaths.slice(0, outermostErrorIndex + 1);
    activePathData.activePaths = locActivePaths;
    activePathData.outermostErrorBoundaryIndex =
      closestParentErrorBoundaryIndex;
    activePathData.actionData = new Array(outermostErrorIndex + 1);
    activePathData.splatSegments = item.splatSegments;
    activePathData.params = item.params;
    activePathData.activeComponents = activeComponents.slice(
      0,
      outermostErrorIndex,
    );
    activePathData.activeErrorBoundaries = activeErrorBoundaries.slice(
      0,
      outermostErrorIndex + 1,
    );
    return { response: null, activePathData };
  }

  activePathData.matchingPaths = item.decoratedMatchingPaths;
  activePathData.activeHeads = activeHeads;
  activePathData.loadersData = loadersData;
  activePathData.activePaths = item.activePaths;
  activePathData.outermostErrorBoundaryIndex = closestParentErrorBoundaryIndex;
  const locActionData = new Array(activePathData.activePaths?.length).fill(
    null,
  );
  locActionData[locActionData.length - 1] = actionData;
  activePathData.actionData = locActionData;
  activePathData.splatSegments = item.splatSegments;
  activePathData.params = item.params;
  activePathData.activeComponents = activeComponents;
  activePathData.activeErrorBoundaries = activeErrorBoundaries;
  return { response: null, activePathData };
}

const acceptedMethods = ["POST", "PUT", "PATCH", "DELETE"];

async function getActionData(
  request: Request,
  action: Action | undefined,
  params: Record<string, string>,
  splatSegments: Array<string>,
): Promise<{
  data: any;
  error: Error | null;
}> {
  if (!action || !acceptedMethods.includes(request.method)) {
    return { data: null, error: null };
  }
  try {
    const data = await action({
      request,
      params: params,
      splatSegments: splatSegments,
    });

    return { data, error: null };
  } catch (e) {
    console.error(e);

    return {
      data: null,
      error: e instanceof Error ? e : new Error("Unknown"),
    };
  }
}

function findClosestParentErrorBoundaryIndex(
  activeErrorBoundaries: Array<any>,
  outermostErrorIndex: number,
): number {
  for (let i = outermostErrorIndex - 1; i >= 0; i--) {
    if (activeErrorBoundaries[i]) {
      return activeErrorBoundaries.length - 1 - i;
    }
  }
  return -1;
}

const emptyMatcherOutput: MatcherOutput = {
  path: "",
  pattern: "",
  matches: false,
  params: {},
  score: 0,
  realSegmentLeangth: 0,
};

function matcher(pattern: string, path: string): MatcherOutput {
  pattern = pattern.startsWith("/") ? pattern.slice(1) : pattern;
  path = path.startsWith("/") ? path.slice(1) : path;
  const patternSegments = pattern.split("/");
  const pathSegments = path.split("/");
  let adjPatternSegmentsLength = patternSegments.length;
  const pathSegmentsLength = pathSegments.length;
  const isCatch =
    patternSegments[adjPatternSegmentsLength - 1] === SPLAT_SEGMENT;
  if (isCatch) {
    adjPatternSegmentsLength--;
  }
  if (adjPatternSegmentsLength > pathSegmentsLength) {
    return emptyMatcherOutput;
  }
  let matches = false;
  const params: Record<string, string> = {};
  if (pattern === path) {
    matches = true;
  } else {
    for (let i = 0; i < patternSegments.length; i++) {
      const patternSegment = patternSegments[i];
      if (i < pathSegmentsLength && patternSegment === pathSegments[i]) {
        matches = true;
        continue;
      }
      if (patternSegment === SPLAT_SEGMENT) {
        matches = true;
        continue;
      }
      if (patternSegment.startsWith(":")) {
        matches = true;
        const paramKey = patternSegment.slice(1);
        if (paramKey !== "catch*") {
          params[paramKey] = pathSegments[i];
        }
        continue;
      }
      matches = false;
      break;
    }
  }
  if (!matches) {
    return emptyMatcherOutput;
  }
  const strength = getMatchStrength(pattern, path);
  return {
    path,
    pattern,
    matches,
    params,
    score: strength.score,
    realSegmentLeangth: strength.realSegmentsLength,
  };
}

function stableHash(obj: Record<string, any>): string {
  return JSON.stringify(
    Object.keys(obj)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = obj[key];
          return result;
        },
        {} as Record<string, any>,
      ),
  );
}

export type SortedHeadBlocks = {
  title: string;
  metaHeadBlocks: Array<OtherHeadBlock>;
  restHeadBlocks: Array<OtherHeadBlock>;
};

function sortAndDedupeHeadBlocks(headBlocks: HeadBlock[]): SortedHeadBlocks {
  let title = "";
  const metaHeadBlocks = new Map<any, OtherHeadBlock>();
  const restHeadBlocks = new Map<any, OtherHeadBlock>();

  for (let i = 0; i < headBlocks.length; i++) {
    const block = headBlocks[i];

    if ("title" in block) {
      title = block.title;
    } else if (block.tag === "meta") {
      const name = block.attributes?.name;
      if (name === "description") {
        metaHeadBlocks.set("description", block);
      } else {
        metaHeadBlocks.set(stableHash(block), block);
      }
    } else {
      restHeadBlocks.set(stableHash(block), block);
    }
  }

  return {
    title,
    metaHeadBlocks: Array.from(metaHeadBlocks.values()),
    restHeadBlocks: Array.from(restHeadBlocks.values()),
  };
}

type GetExportedHeadBlocksProps = {
  request: Request;
  activePathData: ActivePathData;
};

function getExportedHeadBlocks({
  request,
  activePathData,
}: GetExportedHeadBlocksProps): SortedHeadBlocks {
  const nonDeduped =
    activePathData?.activeHeads?.flatMap((head, i) => {
      if (!head || !activePathData?.activePaths?.[i]) {
        return [];
      }
      return head({
        loaderData: activePathData?.loadersData?.[i],
        actionData: activePathData.actionData,
        dataProps: {
          request,
          params: activePathData.params,
          splatSegments: activePathData.splatSegments,
        },
      });
    }) ?? [];

  return sortAndDedupeHeadBlocks([
    ...hwyGlobal.get("defaultHeadBlocks"),
    ...nonDeduped.flat(),
  ]);
}

export function getIsJSONRequest(request: Request): boolean {
  const url = new URL(request.url);
  return Boolean(url.searchParams.get(`${HWY_PREFIX}json`));
}

export type RouteData = {
  response: Response | null;
  data: GetRouteDataOutput | null;
  ssrData?: {
    ssrInnerHtml: string;
    clientEntryURL: string;
    devRefreshScript: string;
    criticalCSSElementID: string;
    criticalCSS: string;
    bundledCSSURL: string;
  };
};

export async function getRouteData({
  request,
  adHocData,
}: {
  request: Request;
  adHocData: AdHocData | undefined;
}): Promise<RouteData> {
  const { activePathData, response } = await getMatchingPathData(request);

  if (response) {
    return { response, data: null };
  }

  if (!activePathData || !activePathData.matchingPaths?.length) {
    return { response: null, data: null };
  }

  const hwyGlobal = getHwyGlobal();

  const { title, metaHeadBlocks, restHeadBlocks } = getExportedHeadBlocks({
    request,
    activePathData,
  });

  const isJSON = getIsJSONRequest(request);

  const data: GetRouteDataOutput = {
    title: title,
    metaHeadBlocks: metaHeadBlocks,
    restHeadBlocks: restHeadBlocks,
    loadersData: activePathData.loadersData,
    activePaths: activePathData.activePaths,
    outermostErrorBoundaryIndex: activePathData.outermostErrorBoundaryIndex,
    splatSegments: activePathData.splatSegments,
    params: activePathData.params,
    actionData: activePathData.actionData,
    adHocData: adHocData ?? {},
    buildID: hwyGlobal.get("buildID"),
    activeComponents: isJSON ? null : activePathData.activeComponents,
    activeErrorBoundaries: isJSON ? null : activePathData.activeErrorBoundaries,
  };

  return {
    response: null,
    data,
    ssrData: isJSON
      ? undefined
      : {
          ssrInnerHtml: getSsrInnerHtml(data),
          clientEntryURL: getPublicUrl("dist/entry.client.js"),
          devRefreshScript: getDevRefreshScript(),
          criticalCSSElementID: CRITICAL_CSS_ELEMENT_ID,
          criticalCSS: hwyGlobal.get("criticalBundledCSS") || "",
          bundledCSSURL: getPublicUrl("dist/standard-bundled.css"),
        },
  };
}

type Uneval = (
  value: any,
  replacer?: ((value: any) => string | void) | undefined,
) => string;
let uneval: Uneval | null = null;

try {
  const unevalImport = await import("devalue");
  uneval = unevalImport.uneval;
} catch {}

export function getSsrInnerHtml(baseProps: GetRouteDataOutput) {
  if (!uneval) {
    throw new Error("devalue is not available");
  }
  let html = `
globalThis[Symbol.for("${HWY_PREFIX}")] = {};
const x = globalThis[Symbol.for("${HWY_PREFIX}")];
x.isDev = ${uneval(hwyGlobal.get("isDev"))};
${mkSetterStr("buildID", baseProps.buildID)}
${mkSetterStr("loadersData", baseProps.loadersData)}
${mkSetterStr("activePaths", baseProps.activePaths)}
${mkSetterStr(
  "outermostErrorBoundaryIndex",
  baseProps.outermostErrorBoundaryIndex,
)}
${mkSetterStr("splatSegments", baseProps.splatSegments)}
${mkSetterStr("params", baseProps.params)}
${mkSetterStr("actionData", baseProps.actionData)}
${mkSetterStr("adHocData", baseProps.adHocData)}
`.trim();
  return html;
}

function mkSetterStr(key: (typeof CLIENT_GLOBAL_KEYS)[number], value: any) {
  if (!uneval) {
    throw new Error("devalue is not available");
  }
  return `x.${key}=${uneval(value)};`;
}

// __TODO timeout should be in dev config
function getDevRefreshScript(timeoutInMs = 150) {
  if (!hwyGlobal.get("isDev")) {
    return "";
  }
  return `
  const es = new EventSource("${LIVE_REFRESH_SSE_PATH}");
	es.addEventListener("message", (e) => {
    const { changeType, criticalCss } = JSON.parse(e.data);
    function refresh() {
      if (changeType === "css-bundle") {
        for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
          const url = new URL(link.href);
          if (
            url.host === location.host &&
            url.pathname.startsWith("/public/dist/standard-bundled.")
          ) {
            const next = link.cloneNode();
            next.href = "${DEV_BUNDLED_CSS_LINK}";
            next.onload = () => link.remove();
            link.parentNode?.insertBefore(next, link.nextSibling);
          }
        }
      } else if (changeType === "critical-css") {
        const inlineStyleEl = document.getElementById("${CRITICAL_CSS_ELEMENT_ID}");
        if (inlineStyleEl) {
          inlineStyleEl.innerHTML = criticalCss;
        }
      } else {
        setTimeout(() => window.location.reload(), ${timeoutInMs});
      }
    }
    refresh();
  });
	es.addEventListener("error", (e) => {
		console.log("SSE error", e);
		es.close();
		setTimeout(() => window.location.reload(), ${timeoutInMs});
	});
	window.addEventListener("beforeunload", () => {
		es.close();
	});
  `.trim();
}

export async function renderRoot({
  request,
  adHocData,
  renderCallback,
}: {
  request: Request;
  adHocData?: AdHocData;
  renderCallback: (routeData: RouteData) => any;
}) {
  const routeData = await getRouteData({ request, adHocData });
  if (routeData.response) {
    return routeData.response;
  }
  if (!routeData.data) {
    return;
  }
  if (getIsJSONRequest(request)) {
    return routeData.data;
  }
  return renderCallback(routeData);
}
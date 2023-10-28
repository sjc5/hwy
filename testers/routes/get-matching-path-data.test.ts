import { expect, test } from "vitest";
import { get_hwy_global } from "../../packages/core/src/utils/get-hwy-global.js";
import { getMatchingPathData } from "hwy";

const hwy_global = get_hwy_global();

const test_paths = await import("./dist/paths.js" as any).then(
  (m) => m.__hwy__paths,
);

hwy_global.set("paths", test_paths);
hwy_global.set("test_dirname", "testers/routes/dist");

type ExpectedOutput = {
  params: Record<string, string>;
  splatSegments: Array<string>;
  matchingPaths: Array<{
    endsInDynamic: boolean;
    endsInSplat: boolean;
    isIndex: boolean;
    isUltimateCatch: boolean;
    filePath: string;
  }>;
};

function gmpd_tester({
  path,
  expected_output,
}: {
  path: string;
  expected_output: ExpectedOutput;
}) {
  test(`getMatchingPathData: ${path}`, async () => {
    const raw = await getMatchingPathData({
      c: {
        req: {
          method: "GET",
          path,
          raw: {
            headers: new Map(),
          },
        },
      } as any,
    });

    const simplified = {
      params: raw.params || {},
      splatSegments: raw.splatSegments || [],
      matchingPaths:
        raw.matchingPaths?.map((path) => {
          return {
            endsInDynamic: path.endsInDynamic,
            endsInSplat: path.endsInSplat,
            isIndex: path.isIndex,
            isUltimateCatch: path.isUltimateCatch,
            filePath: path.importPath.replace(".js", ".page.tsx"),
          };
        }) || [],
    } satisfies ExpectedOutput;

    expect(simplified).toEqual(expected_output);
  });
}

type IndividualMatch = ExpectedOutput["matchingPaths"][number];

const ultimate_catch: IndividualMatch = {
  endsInDynamic: false,
  endsInSplat: true,
  isIndex: false,
  isUltimateCatch: true,
  filePath: "pages/$.page.tsx",
};

gmpd_tester({
  path: "/this-should-be-ignored",
  expected_output: {
    matchingPaths: [ultimate_catch],
    params: {},
    splatSegments: ["this-should-be-ignored"],
  },
});

gmpd_tester({
  path: "/does-not-exist",
  expected_output: {
    matchingPaths: [ultimate_catch],
    params: {},
    splatSegments: ["does-not-exist"],
  },
});

gmpd_tester({
  path: "/",
  expected_output: {
    matchingPaths: [
      {
        endsInDynamic: false,
        endsInSplat: false,
        isIndex: true,
        isUltimateCatch: false,
        filePath: "pages/_index.page.tsx",
      },
    ],
    params: {},
    splatSegments: [],
  },
});

gmpd_tester({
  path: "/bear",
  expected_output: {
    matchingPaths: [
      {
        endsInDynamic: false,
        endsInSplat: false,
        isIndex: false,
        isUltimateCatch: false,
        filePath: "pages/bear.page.tsx", // LAYOUT
      },

      {
        endsInDynamic: false,
        endsInSplat: false,
        isIndex: true,
        isUltimateCatch: false,
        filePath: "pages/bear/_index.page.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/bear/123"

gmpd_tester({
  path: "/bear/123",
  expected_output: {
    matchingPaths: [
      {
        endsInDynamic: false,
        endsInSplat: false,
        isIndex: false,
        isUltimateCatch: false,
        filePath: "pages/bear.page.tsx", // LAYOUT ("bear")
      },
      {
        endsInDynamic: true,
        endsInSplat: false,
        isIndex: false,
        isUltimateCatch: false,
        filePath: "pages/bear/$bear_id.page.tsx", // LAYOUT ("$bear_id")
      },
    ],
    params: { bear_id: "123" },
    splatSegments: [],
  },
});

// "/bear/123/456"
// should render bear.page.tsx (bear layout), and bear/$bear_id.page.tsx (123 layout), and bear/$bear_id/$.page.tsx (456 catch)
// params should be { bear_id: "123" } and splatSegments should be ["456"]

gmpd_tester({
  path: "/bear/123/456",
  expected_output: {
    matchingPaths: [
      {
        endsInDynamic: false,
        endsInSplat: false,
        isIndex: false,
        isUltimateCatch: false,
        filePath: "pages/bear.page.tsx", // LAYOUT ("bear")
      },
      {
        endsInDynamic: true,
        endsInSplat: false,
        isIndex: false,
        isUltimateCatch: false,
        filePath: "pages/bear/$bear_id.page.tsx", // LAYOUT ("$bear_id")
      },
      {
        endsInDynamic: false,
        endsInSplat: true,
        isIndex: false,
        isUltimateCatch: false,
        filePath: "pages/bear/$bear_id/$.page.tsx", // CATCH ("456")
      },
    ],
    params: { bear_id: "123" },
    splatSegments: ["456"],
  },
});

// "/bear/123/456/789"
// same as above but with two splat segments

gmpd_tester({
  path: "/bear/123/456/789",
  expected_output: {
    matchingPaths: [
      {
        endsInDynamic: false,
        endsInSplat: false,
        isIndex: false,
        isUltimateCatch: false,
        filePath: "pages/bear.page.tsx", // LAYOUT ("bear")
      },
      {
        endsInDynamic: true,
        endsInSplat: false,
        isIndex: false,
        isUltimateCatch: false,
        filePath: "pages/bear/$bear_id.page.tsx", // LAYOUT ("$bear_id")
      },
      {
        endsInDynamic: false,
        endsInSplat: true,
        isIndex: false,
        isUltimateCatch: false,
        filePath: "pages/bear/$bear_id/$.page.tsx", // CATCH ("456" & "789")
      },
    ],
    params: { bear_id: "123" },
    splatSegments: ["456", "789"],
  },
});

// "/lion"
// "/lion/123"
// "/lion/123/456"
// "/lion/123/456/789"

// "/tiger"
// "/tiger/123"
// "/tiger/123/456"
// "/tiger/123/456/789"

// "/dashboard"
// "/dashboard/asdf"
// "/dashboard/customers"
// "/dashboard/customers/123"
// "/dashboard/customers/123/orders"
// "/dashboard/customers/123/orders/456"

// "/articles"
// "/articles/test"
// "/articles/test/articles"
// "/articles/bob"

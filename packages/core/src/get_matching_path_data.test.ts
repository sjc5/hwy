import { expect, test } from "vitest";

test("testsAreWorking", async () => {
  expect(0).toBe(0);
});

import { HWY_PREFIX, getHwyGlobal } from "../../common/index.mjs";
import { getMatchingPathData } from "./router.js";

const hwyGlobal = getHwyGlobal();

const testPaths = await import(
  "../../../testers/routes/dist/paths.js" as any
).then((m) => m[HWY_PREFIX + "paths"]);

hwyGlobal.set("paths", testPaths);
hwyGlobal.set("rootDirname", "testers/routes/dist");
hwyGlobal.set("hwyConfig", { routeStrategy: "always-lazy" });

type ExpectedOutput = {
  params: Record<string, string>;
  splatSegments: Array<string>;
  matchingPaths: Array<{
    pathType: NonNullable<
      NonNullable<
        Awaited<ReturnType<typeof getMatchingPathData>>["activePathData"]
      >["matchingPaths"]
    >[number]["pathType"];
    // filePath: string;
  }>;
};

function gmpdTester({
  path,
  expectedOutput,
}: {
  path: string;
  expectedOutput: ExpectedOutput;
}) {
  test(`getMatchingPathData: ${path}`, async () => {
    const req: Request = {
      method: "GET",
      url: "https://example.com" + path,
      headers: {
        host: "localhost",
      },
    } as any;
    const { activePathData: raw, response } = await getMatchingPathData(req);

    if (!raw) {
      expect(response instanceof Response).toBe(true);
      return;
    }

    const simplified = {
      params: raw.params || {},
      splatSegments: raw.splatSegments || [],
      matchingPaths:
        raw.matchingPaths?.map((path) => {
          return {
            pathType: path.pathType,
            // filePath: path.importPath.replace(".js", ".tsx"),
          };
        }) || [],
    } satisfies ExpectedOutput;

    expect(simplified).toEqual(expectedOutput);
  });
}

type IndividualMatch = ExpectedOutput["matchingPaths"][number];

const ultimateCatch = {
  pathType: "ultimate-catch",
  // filePath: "pages/$.ui.tsx",
} as const satisfies IndividualMatch;

/******************
ULTIMATE CATCH
******************/

// does not exist

gmpdTester({
  path: "/does-not-exist",
  expectedOutput: {
    matchingPaths: [ultimateCatch],
    params: {},
    splatSegments: ["does-not-exist"],
  },
});

// ".ui." not in file name, otherwise a valid component

gmpdTester({
  path: "/this-should-be-ignored",
  expectedOutput: {
    matchingPaths: [ultimateCatch],
    params: {},
    splatSegments: ["this-should-be-ignored"],
  },
});

/******************
ULTIMATE INDEX
******************/

gmpdTester({
  path: "/",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "index",
        // filePath: "pages/_index.ui.tsx",
      },
    ],
    params: {},
    splatSegments: [],
  },
});

/******************
LIONS
******************/

// "/lion"
// should render "lion.ui.tsx" (LAYOUT)
// and "lion/_index.ui.tsx" (INDEX)

gmpdTester({
  path: "/lion",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/lion.ui.tsx", // LAYOUT
      },
      {
        pathType: "index",
        // filePath: "pages/lion/_index.ui.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/lion/123"
// should render "lion.ui.tsx" (LAYOUT)
// and "lion/$.ui.tsx" (SPLAT)

gmpdTester({
  path: "/lion/123",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/lion.ui.tsx", // LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        // filePath: "pages/lion/$.ui.tsx", // SPLAT
      },
    ],
    params: {},
    splatSegments: ["123"],
  },
});

// "/lion/123/456"
// same as above but with two splat segments

gmpdTester({
  path: "/lion/123/456",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/lion.ui.tsx", // LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        // filePath: "pages/lion/$.ui.tsx", // SPLAT
      },
    ],
    params: {},
    splatSegments: ["123", "456"],
  },
});

// "/lion/123/456/789"
// same as above but with three splat segments

gmpdTester({
  path: "/lion/123/456/789",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/lion.ui.tsx", // LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        // filePath: "pages/lion/$.ui.tsx", // SPLAT
      },
    ],
    params: {},
    splatSegments: ["123", "456", "789"],
  },
});

/******************
AND TIGERS
******************/

// "/tiger"
// should render "tiger.ui.tsx" (LAYOUT)
// and "tiger/_index.ui.tsx" (INDEX)

gmpdTester({
  path: "/tiger",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/tiger.ui.tsx", // LAYOUT
      },
      {
        pathType: "index",
        // filePath: "pages/tiger/_index.ui.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/tiger/123"
// should render "tiger.ui.tsx" (LAYOUT)
// and "tiger/$tiger_id.ui.tsx" ($tiger_id LAYOUT)
// and "tiger/$tiger_id/_index.ui.tsx" ($tiger_id INDEX)

gmpdTester({
  path: "/tiger/123",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/tiger.ui.tsx", // LAYOUT
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/tiger/$tiger_id.ui.tsx", // $tiger_id LAYOUT
      },
      {
        pathType: "index",
        // filePath: "pages/tiger/$tiger_id/_index.ui.tsx", // $tiger_id INDEX
      },
    ],
    params: { tiger_id: "123" },
    splatSegments: [],
  },
});

// "/tiger/123/456"
// should render "tiger.ui.tsx" (LAYOUT)
// and "tiger/$tiger_id.ui.tsx" ($tiger_id LAYOUT)
// and "tiger/$tiger_id/$tiger_cub_id.ui.tsx" ($tiger_cub_id LAYOUT)

gmpdTester({
  path: "/tiger/123/456",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/tiger.ui.tsx", // LAYOUT
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/tiger/$tiger_id.ui.tsx", // $tiger_id LAYOUT
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/tiger/$tiger_id/$tiger_cub_id.ui.tsx", // $tiger_id LAYOUT
      },
    ],
    params: { tiger_id: "123", tiger_cub_id: "456" },
    splatSegments: [],
  },
});

// "/tiger/123/456/789"
// should render "tiger.ui.tsx" (LAYOUT)
// and "tiger/$tiger_id.ui.tsx" ($tiger_id LAYOUT)
// and "tiger/$tiger_id/$.ui.tsx" (CATCH)

gmpdTester({
  path: "/tiger/123/456/789",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/tiger.ui.tsx", // LAYOUT
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/tiger/$tiger_id.ui.tsx", // $tiger_id LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        // filePath: "pages/tiger/$tiger_id/$.ui.tsx", // CATCH
      },
    ],
    params: { tiger_id: "123" },
    splatSegments: ["456", "789"],
  },
});

/******************
AND BEARS
******************/

gmpdTester({
  path: "/bear",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/bear.ui.tsx", // LAYOUT
      },

      {
        pathType: "index",
        // filePath: "pages/bear/_index.ui.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/bear/123"

gmpdTester({
  path: "/bear/123",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/bear.ui.tsx", // LAYOUT ("bear")
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/bear/$bear_id.ui.tsx", // LAYOUT ("$bear_id")
      },
    ],
    params: { bear_id: "123" },
    splatSegments: [],
  },
});

// "/bear/123/456"
// should render bear.ui.tsx (bear layout), and bear/$bear_id.ui.tsx (123 layout), and bear/$bear_id/$.ui.tsx (456 catch)
// params should be { bear_id: "123" } and splatSegments should be ["456"]

gmpdTester({
  path: "/bear/123/456",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/bear.ui.tsx", // LAYOUT ("bear")
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/bear/$bear_id.ui.tsx", // LAYOUT ("$bear_id")
      },
      {
        pathType: "non-ultimate-splat",
        // filePath: "pages/bear/$bear_id/$.ui.tsx", // CATCH ("456")
      },
    ],
    params: { bear_id: "123" },
    splatSegments: ["456"],
  },
});

// "/bear/123/456/789"
// same as above but with two splat segments

gmpdTester({
  path: "/bear/123/456/789",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/bear.ui.tsx", // LAYOUT ("bear")
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/bear/$bear_id.ui.tsx", // LAYOUT ("$bear_id")
      },
      {
        pathType: "non-ultimate-splat",
        // filePath: "pages/bear/$bear_id/$.ui.tsx", // CATCH ("456" & "789")
      },
    ],
    params: { bear_id: "123" },
    splatSegments: ["456", "789"],
  },
});

/******************
OH MY!
******************/

/******************
DASHBOARD
******************/

// "/dashboard"
// should render "/dashboard.ui.tsx" (LAYOUT)
// and "/dashboard/_index.ui.tsx" (INDEX)

gmpdTester({
  path: "/dashboard",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard.ui.tsx", // LAYOUT
      },
      {
        pathType: "index",
        // filePath: "pages/dashboard/_index.ui.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/dashboard/asdf"
// should render "/dashboard.ui.tsx" (LAYOUT)
// and "/dashboard/$.ui.tsx" (CATCH)

gmpdTester({
  path: "/dashboard/asdf",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard.ui.tsx", // LAYOUT
      },
      {
        pathType: "non-ultimate-splat",
        // filePath: "pages/dashboard/$.ui.tsx", // CATCH
      },
    ],
    params: {},
    splatSegments: ["asdf"],
  },
});

// "/dashboard/customers"
// should render "/dashboard.ui.tsx" (LAYOUT)
// and "/dashboard/customers.ui.tsx" (customers LAYOUT)
// and "/dashboard/customers/_index.ui.tsx" (customers INDEX)

gmpdTester({
  path: "/dashboard/customers",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard.ui.tsx", // LAYOUT
      },
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard/customers.ui.tsx", // customers LAYOUT
      },
      {
        pathType: "index",
        // filePath: "pages/dashboard/customers/_index.ui.tsx", // customers INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/dashboard/customers/123"
// should render "/dashboard.ui.tsx" (LAYOUT)
// and "/dashboard/customers.ui.tsx" (customers LAYOUT)
// and "/dashboard/customers/$customer_id.ui.tsx" ($customer_id LAYOUT)
// and "/dashboard/customers/$customer_id/_index.ui.tsx" ($customer_id INDEX)

gmpdTester({
  path: "/dashboard/customers/123",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard.ui.tsx", // LAYOUT
      },
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard/customers.ui.tsx", // customers LAYOUT
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/dashboard/customers/$customer_id.ui.tsx", // $customer_id LAYOUT
      },
      {
        pathType: "index",
        // filePath: "pages/dashboard/customers/$customer_id/_index.ui.tsx", // $customer_id INDEX
      },
    ],
    params: {
      customer_id: "123",
    },
    splatSegments: [],
  },
});

// "/dashboard/customers/123/orders"
// should render "/dashboard.ui.tsx" (LAYOUT)
// and "/dashboard/customers.ui.tsx" (customers LAYOUT)
// and "/dashboard/customers/$customer_id.ui.tsx" ($customer_id LAYOUT)
// and "/dashboard/customers/$customer_id/orders.ui.tsx" (orders LAYOUT)
// and "/dashboard/customers/$customer_id/orders/_index.ui.tsx" (orders INDEX)

gmpdTester({
  path: "/dashboard/customers/123/orders",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard.ui.tsx", // LAYOUT
      },
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard/customers.ui.tsx", // customers LAYOUT
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/dashboard/customers/$customer_id.ui.tsx", // $customer_id LAYOUT
      },
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard/customers/$customer_id/orders.ui.tsx", // orders LAYOUT
      },
      {
        pathType: "index",
        // filePath: "pages/dashboard/customers/$customer_id/orders/_index.ui.tsx", // orders INDEX
      },
    ],
    params: {
      customer_id: "123",
    },
    splatSegments: [],
  },
});

// "/dashboard/customers/123/orders/456"
// should render "/dashboard.ui.tsx" (LAYOUT)
// and "/dashboard/customers.ui.tsx" (customers LAYOUT)
// and "/dashboard/customers/$customer_id.ui.tsx" ($customer_id LAYOUT)
// and "/dashboard/customers/$customer_id/orders.ui.tsx" (orders LAYOUT)
// and "/dashboard/customers/$customer_id/orders/$order_id.ui.tsx" ($order_id LAYOUT)

gmpdTester({
  path: "/dashboard/customers/123/orders/456",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard.ui.tsx", // LAYOUT
      },
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard/customers.ui.tsx", // customers LAYOUT
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/dashboard/customers/$customer_id.ui.tsx", // $customer_id LAYOUT
      },
      {
        pathType: "static-layout",
        // filePath: "pages/dashboard/customers/$customer_id/orders.ui.tsx", // orders LAYOUT
      },
      {
        pathType: "dynamic-layout",
        // filePath: "pages/dashboard/customers/$customer_id/orders/$order_id.ui.tsx", // $order_id LAYOUT
      },
    ],
    params: {
      customer_id: "123",
      order_id: "456",
    },
    splatSegments: [],
  },
});

// "/articles"
// should render "/articles/_index.ui.tsx" (INDEX)

gmpdTester({
  path: "/articles",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "index",
        // filePath: "pages/articles/_index.ui.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/articles/bob"
// should render ultimate catch
gmpdTester({
  path: "/articles/bob",
  expectedOutput: {
    matchingPaths: [ultimateCatch],
    params: {},
    splatSegments: ["articles", "bob"],
  },
});

// "/articles/test"
// should render ultimate catch (even though "test" directory exists)

gmpdTester({
  path: "/articles/test",
  expectedOutput: {
    matchingPaths: [ultimateCatch],
    params: {},
    splatSegments: ["articles", "test"],
  },
});

// "/articles/test/articles"
// should render "/articles/test/articles/_index.ui.tsx" (articles-test-articles INDEX)

gmpdTester({
  path: "/articles/test/articles",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "index",
        // filePath: "pages/articles/test/articles/_index.ui.tsx", // INDEX
      },
    ],
    params: {},
    splatSegments: [],
  },
});

// "/dynamic-index/index"
// should render "/dynamic-index/__site_index/index.ui.tsx"

gmpdTester({
  path: "/dynamic-index/index",
  expectedOutput: {
    matchingPaths: [
      {
        pathType: "static-layout",
        // filePath: "pages/dynamic-index/__site_index/index.ui.tsx",
      },
    ],
    params: {},
    splatSegments: [],
  },
});

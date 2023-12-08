import type { getMatchingPathData } from "../router/get-matching-path-data.js";
import type { ErrorBoundaryProps } from "../types.js";
import { type JSX } from "preact";
import { useCallback } from "preact/hooks";
import { get_hwy_client_global } from "../utils/get-hwy-global.js";

type ErrorBoundaryComp = (props: ErrorBoundaryProps) => JSX.Element;

type ActivePathData = Awaited<ReturnType<typeof getMatchingPathData>>;
type ServerKey = keyof ActivePathData;

function RootOutlet(props: {
  activePathData?: Awaited<ReturnType<typeof getMatchingPathData>>;
  index?: number;
  fallbackErrorBoundary?: (props: {
    error: Error;
    splatSegments: string[];
    params: Record<string, string>;
  }) => JSX.Element;
}): JSX.Element {
  const IS_SERVER = typeof document === "undefined";

  let context: { get: (str: ServerKey) => ActivePathData[ServerKey] } =
    IS_SERVER
      ? {
          get: (str: ServerKey) => props.activePathData?.[str],
        }
      : (get_hwy_client_global() as any);

  let { index } = props;
  const index_to_use = index ?? 0;

  try {
    if (!context.get("activeComponents")?.[index_to_use]) {
      return <></>;
    }

    const this_is_an_error_boundary =
      context.get("outermostErrorBoundaryIndex") === index_to_use;

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      context.get("activeErrorBoundaries")?.[index_to_use] ??
      props.fallbackErrorBoundary;

    if (
      this_is_an_error_boundary ||
      context.get("outermostErrorBoundaryIndex") === -1
    ) {
      if (!ErrorBoundary) {
        return <div>Error: No error boundary found.</div>;
      }

      return ErrorBoundary({
        error: context.get("errorToRender"),
      });
    }

    const Outlet = useCallback(
      (local_props: Record<string, any> | undefined) => {
        return RootOutlet({
          ...local_props,
          index: index_to_use + 1,
        });
      },
      [],
    );

    return context.get("activeComponents")?.[index_to_use]({
      ...props,
      params: context.get("params") ?? {},
      splatSegments: context.get("splatSegments") ?? [],
      Outlet,
      loaderData: context.get("activeData")?.[index_to_use],
      actionData: context.get("actionData")?.[index_to_use],
      path: context.get("activePaths")?.[index_to_use],
    });
  } catch (error) {
    console.error(error);

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      (globalThis as any).ACTIVE_PATH_DATA.value?.activeErrorBoundaries
        ?.splice(0, index_to_use + 1)
        ?.reverse()
        ?.find((x: any) => x) ?? props.fallbackErrorBoundary;

    if (!ErrorBoundary) {
      return <div>Error: No error boundary found.</div>;
    }

    return ErrorBoundary({ error });
  }
}

export { RootOutlet };

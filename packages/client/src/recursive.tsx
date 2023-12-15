import { type JSX } from "preact";
import { useCallback } from "preact/hooks";
import type {
  ActivePathData,
  ErrorBoundaryProps,
} from "../../common/index.mjs";
import { get_hwy_client_global } from "./client-global.js";

type ErrorBoundaryComp = (props: ErrorBoundaryProps) => JSX.Element;

type ServerKey = keyof ActivePathData;

function RootOutlet(props: {
  activePathData?: ActivePathData | { fetchResponse: Response };
  index?: number;
  fallbackErrorBoundary?: ErrorBoundaryComp;
}): JSX.Element {
  const { activePathData } = props;
  if (activePathData && "fetchResponse" in activePathData) return <></>;

  const IS_SERVER = typeof document === "undefined";

  let context: {
    get: (str: ServerKey) => ActivePathData[ServerKey];
  } = IS_SERVER
    ? {
        get: (str: ServerKey) =>
          (props.activePathData as ActivePathData)?.[str],
      }
    : (get_hwy_client_global() as any);

  let { index } = props;
  const index_to_use = index ?? 0;
  const CurrentComponent = context.get("activeComponents")?.[index_to_use];

  try {
    if (!CurrentComponent) {
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
        params: context.get("params") ?? {},
        splatSegments: context.get("splatSegments") ?? [],
      });
    }

    const outlet_fn = (local_props: Record<string, any> | undefined) => {
      return RootOutlet({
        ...local_props,
        activePathData: IS_SERVER ? props.activePathData : undefined,
        index: index_to_use + 1,
      });
    };

    const Outlet = IS_SERVER
      ? outlet_fn
      : useCallback(outlet_fn, [
          context.get("activePaths")?.[index_to_use + 1],
        ]);

    return CurrentComponent({
      ...props,
      params: context.get("params") ?? {},
      splatSegments: context.get("splatSegments") ?? [],
      loaderData: context.get("activeData")?.[index_to_use],
      actionData: context.get("actionData")?.[index_to_use],
      Outlet,
    });
  } catch (error) {
    console.error(error);

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      context
        .get("activeErrorBoundaries")
        ?.splice(0, index_to_use + 1)
        ?.reverse()
        ?.find((x: any) => x) ?? props.fallbackErrorBoundary;

    if (!ErrorBoundary) {
      return <div>Error: No error boundary found.</div>;
    }

    return ErrorBoundary({
      error,
      params: context.get("params") ?? {},
      splatSegments: context.get("splatSegments") ?? [],
    });
  }
}

export { RootOutlet };

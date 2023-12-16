import { useCallback } from "preact/hooks";
import {
  get_hwy_client_global,
  type ActivePathData,
  type ErrorBoundaryProps,
} from "../../common/index.mjs";

type ErrorBoundaryComp<JSXElement> = (props: ErrorBoundaryProps) => JSXElement;

type ServerKey = keyof ActivePathData;

type JSXElement = any;

function RootOutlet(props: {
  activePathData?: ActivePathData | { fetchResponse: Response };
  index?: number;
  fallbackErrorBoundary?: ErrorBoundaryComp<JSXElement>;
}): JSXElement {
  const { activePathData } = props;
  if (activePathData && "fetchResponse" in activePathData) {
    // @ts-ignore
    return <></>;
  }

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
      // @ts-ignore
      return <></>;
    }

    const this_is_an_error_boundary =
      context.get("outermostErrorBoundaryIndex") === index_to_use;

    const ErrorBoundary: ErrorBoundaryComp<JSXElement> | undefined =
      context.get("activeErrorBoundaries")?.[index_to_use] ??
      props.fallbackErrorBoundary;

    if (
      this_is_an_error_boundary ||
      context.get("outermostErrorBoundaryIndex") === -1
    ) {
      if (!ErrorBoundary) {
        // @ts-ignore
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

    const ErrorBoundary: ErrorBoundaryComp<JSXElement> | undefined =
      context
        .get("activeErrorBoundaries")
        ?.splice(0, index_to_use + 1)
        ?.reverse()
        ?.find((x: any) => x) ?? props.fallbackErrorBoundary;

    if (!ErrorBoundary) {
      // @ts-ignore
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

import type { getMatchingPathData } from "../router/get-matching-path-data.js";
import type { ErrorBoundaryProps } from "../types.js";
import { type JSX } from "preact";
import { useCallback } from "preact/hooks";

type ErrorBoundaryComp = (props: ErrorBoundaryProps) => JSX.Element;

const keys = [
  "active_import_paths",
  "active_data",
  "active_paths",
  "outermost_error_boundary_index",
  "error_to_render",
  "splat_segments",
  "params",
  "action_data",
  "active_components",
  "active_error_boundaries",
] as const;

const camelKeys = keys.map((x) => {
  return x.replace(/_(\w)/g, (m) => m[1].toUpperCase());
});

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

  const server_context = {};

  function get_context() {
    return IS_SERVER ? server_context : (globalThis as any).__hwy__;
  }

  /////////////////////////
  // if (props.activePathData) {
  //   for (const key of keys) {
  //     get_context()[key] = signal(get_context()[key]);

  //     console.log(key, ":", get_context()[key].value);
  //   }
  // }
  ////////////////////////
  let { index } = props;
  const index_to_use = index ?? 0;

  try {
    if (!get_context().active_components.value?.[index_to_use]) {
      return <></>;
    }

    const this_is_an_error_boundary =
      get_context().outermost_error_boundary_index.value === index_to_use;

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      get_context().active_error_boundaries.value?.[index_to_use] ??
      props.fallbackErrorBoundary;

    if (
      this_is_an_error_boundary ||
      get_context().outermost_error_boundary_index.value === -1
    ) {
      if (!ErrorBoundary) {
        return <div>Error: No error boundary found.</div>;
      }

      return ErrorBoundary({
        error: get_context().error_to_render.value,
      });
    }

    const CurrentComponent =
      get_context().active_components.value?.[index_to_use];

    const Outlet = useCallback(
      (local_props: Record<string, any> | undefined) => {
        return RootOutlet({
          ...local_props,
          index: index_to_use + 1,
        });
      },
      [],
    );

    return (
      <CurrentComponent
        {...props}
        params={get_context().params.value}
        splatSegments={get_context().splat_segments.value}
        Outlet={Outlet}
        loaderData={get_context().active_data.value?.[index_to_use]}
        actionData={get_context().action_data.value?.[index_to_use]}
        path={get_context().active_paths.value?.[index_to_use]}
      />
    );

    return get_context().active_components.value?.[index_to_use]({
      ...props,
      params: get_context().params.value,
      splatSegments: get_context().splat_segments.value,
      Outlet: (local_props: Record<string, any> | undefined) => {
        return RootOutlet({
          ...local_props,
          index: index_to_use + 1,
        });
      },
      loaderData: get_context().active_data.value?.[index_to_use],
      actionData: get_context().action_data.value?.[index_to_use],
      path: get_context().active_paths.value?.[index_to_use],
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

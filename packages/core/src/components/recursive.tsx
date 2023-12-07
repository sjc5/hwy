import type { getMatchingPathData } from "../router/get-matching-path-data.js";
import type { ErrorBoundaryProps } from "../types.js";
import { type JSX } from "preact";

type ErrorBoundaryComp = (props: ErrorBoundaryProps) => JSX.Element;

function RootOutlet(props: {
  activePathData?: Awaited<ReturnType<typeof getMatchingPathData>>;
  index?: number;
  fallbackErrorBoundary?: (props: {
    error: Error;
    splatSegments: string[];
    params: Record<string, string>;
  }) => JSX.Element;
}): JSX.Element {
  let { index, activePathData: active_path_data } = props;
  const index_to_use = index ?? 0;

  try {
    const CurrentComponent = active_path_data?.activeComponents?.[index_to_use];

    if (!CurrentComponent) {
      return <></>;
    }

    const current_data = active_path_data?.activeData?.[index_to_use];

    const this_is_an_error_boundary =
      active_path_data?.outermostErrorBoundaryIndex === index_to_use;

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      active_path_data?.activeErrorBoundaries?.[index_to_use] ??
      props.fallbackErrorBoundary;

    if (
      this_is_an_error_boundary ||
      active_path_data?.outermostErrorBoundaryIndex === -1
    ) {
      if (!ErrorBoundary) {
        return <div>Error: No error boundary found.</div>;
      }

      return ErrorBoundary({ error: active_path_data?.errorToRender });
    }

    return CurrentComponent({
      ...props,
      params: active_path_data?.params || {},
      splatSegments: active_path_data?.splatSegments || [],
      Outlet: (local_props: Record<string, any> | undefined) => {
        return RootOutlet({
          ...local_props,
          activePathData: active_path_data,
          index: index_to_use + 1,
        });
      },
      loaderData: current_data,
      actionData: active_path_data?.actionData,
      path: active_path_data?.activePaths?.[index_to_use],
    });
  } catch (error) {
    console.error(error);

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      active_path_data?.activeErrorBoundaries
        ?.splice(0, index_to_use + 1)
        ?.reverse()
        ?.find((x) => x) ?? props.fallbackErrorBoundary;

    if (!ErrorBoundary) {
      return <div>Error: No error boundary found.</div>;
    }

    return ErrorBoundary({ error });
  }
}

export { RootOutlet };

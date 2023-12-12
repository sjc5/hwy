import { Context } from "hono";
import { ActivePathData, ErrorBoundaryProps } from "../../common/index.mjs";

/*
NOTE!
Hono Context is passed to components only when you're using Hono JSX.
Not when you're using Preact JSX.
Hono JSX is never run on the client, and it's potentially async.
So it makes sense to pass the context to Hono JSX components.
*/

type ErrorBoundaryComp = (
  props: ErrorBoundaryProps & { c: Context },
) => JSX.Element;

function HonoRootOutlet(props: {
  activePathData: ActivePathData | { fetchResponse: Response };
  index?: number;
  fallbackErrorBoundary?: ErrorBoundaryComp;
  c: Context;
}): JSX.Element {
  const { activePathData } = props;
  if ("fetchResponse" in activePathData) return <></>;
  let { index } = props;
  const index_to_use = index ?? 0;
  const CurrentComponent = activePathData?.activeComponents?.[index_to_use];

  try {
    if (!CurrentComponent) {
      return <></>;
    }

    const this_is_an_error_boundary =
      activePathData.outermostErrorBoundaryIndex === index_to_use;

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      activePathData.activeErrorBoundaries?.[index_to_use] ??
      props.fallbackErrorBoundary;

    if (
      this_is_an_error_boundary ||
      activePathData.outermostErrorBoundaryIndex === -1
    ) {
      if (!ErrorBoundary) {
        return <div>Error: No error boundary found.</div>;
      }

      return (
        <ErrorBoundary
          error={activePathData.errorToRender}
          params={activePathData.params}
          splatSegments={activePathData.splatSegments}
          c={props.c}
        />
      );
    }

    return (
      <CurrentComponent
        {...props}
        params={activePathData.params ?? {}}
        splatSegments={activePathData.splatSegments ?? []}
        loaderData={activePathData.activeData?.[index_to_use]}
        actionData={activePathData.actionData?.[index_to_use]}
        Outlet={async (local_props: Record<string, any> | undefined) => {
          return (
            <HonoRootOutlet
              {...local_props}
              activePathData={activePathData}
              index={index_to_use + 1}
              c={props.c}
            />
          );
        }}
        c={props.c}
      />
    );
  } catch (error) {
    console.error(error);

    const ErrorBoundary: ErrorBoundaryComp | undefined =
      activePathData.activeErrorBoundaries
        ?.splice(0, index_to_use + 1)
        ?.reverse()
        ?.find((x: any) => x) ?? props.fallbackErrorBoundary;

    if (!ErrorBoundary) {
      return <div>Error: No error boundary found.</div>;
    }

    return (
      <ErrorBoundary
        error={error}
        params={activePathData.params}
        splatSegments={activePathData.splatSegments}
        c={props.c}
      />
    );
  }
}

export { HonoRootOutlet };

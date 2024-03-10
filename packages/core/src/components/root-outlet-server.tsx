import type { ActivePathData } from "../../../common/index.mjs";

type ErrorBoundaryComp<JSXElement> = () => JSXElement;
type JSXElement = any;

export function RootOutletServer(props: {
  activePathData?: ActivePathData | { fetchResponse: Response };
  index?: number;
  fallbackErrorBoundary?: ErrorBoundaryComp<JSXElement>;
  adHocData?: any;
}): JSXElement {
  const { activePathData } = props;
  if (activePathData && "fetchResponse" in activePathData) {
    return <></>;
  }

  const APD = props.activePathData as ActivePathData;

  let { index } = props;
  const index_to_use = index ?? 0;
  const CurrentComponent = (APD["activeComponents"] as any)?.[index_to_use];

  const adHocData = props.adHocData;

  try {
    if (!CurrentComponent) {
      return <></>;
    }

    const this_is_an_error_boundary =
      APD["outermostErrorBoundaryIndex"] === index_to_use;

    const next_outlet_is_an_error_boundary =
      APD["outermostErrorBoundaryIndex"] === index_to_use + 1;

    if (
      this_is_an_error_boundary ||
      APD["outermostErrorBoundaryIndex"] === -1
    ) {
      const ErrorBoundary: ErrorBoundaryComp<JSXElement> | undefined =
        (APD["activeErrorBoundaries"] as any)?.[index_to_use] ??
        props.fallbackErrorBoundary;

      if (!ErrorBoundary) {
        return <div>Error: No error boundary found.</div>;
      }

      return <ErrorBoundary />;
    }

    let Outlet;

    if (!next_outlet_is_an_error_boundary) {
      Outlet = (local_props: Record<string, any> | undefined) => {
        return (
          <RootOutletServer
            {...local_props}
            activePathData={props.activePathData}
            index={index_to_use + 1}
          />
        );
      };
    } else {
      Outlet =
        (APD["activeErrorBoundaries"] as any)?.[index_to_use + 1] ??
        props.fallbackErrorBoundary;

      if (!Outlet) {
        Outlet = () => <div>Error: No error boundary found.</div>;
      }
    }

    return (
      <CurrentComponent
        {...props}
        params={APD["params"] ?? {}}
        splatSegments={APD["splatSegments"] ?? []}
        loaderData={(APD["activeData"] as any)?.[index_to_use]}
        actionData={(APD["actionData"] as any)?.[index_to_use]}
        Outlet={Outlet}
        adHocData={adHocData}
      />
    );
  } catch (error) {
    console.error(error);

    const ErrorBoundary: ErrorBoundaryComp<JSXElement> | undefined =
      (APD["activeErrorBoundaries"] as any)
        ?.splice(0, index_to_use + 1)
        ?.reverse()
        ?.find((x: any) => x) ?? props.fallbackErrorBoundary;

    if (!ErrorBoundary) {
      return <div>Error: No error boundary found.</div>;
    }

    return <ErrorBoundary />;
  }
}

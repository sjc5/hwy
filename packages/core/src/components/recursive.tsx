import type { ReactElement } from "react";
import { memo, startTransition, useCallback, useEffect, useState } from "react";
import {
  get_hwy_client_global,
  type ActivePathData,
} from "../../../common/index.mjs";

type ErrorBoundaryComp = () => ReactElement;

type ServerKey = keyof ActivePathData;

export function getAdHocData(): any {
  if (typeof document === "undefined") return;
  return get_hwy_client_global().get("adHocData");
}

export const RootOutlet = memo(
  (props: {
    activePathData?: ActivePathData | { fetchResponse: Response };
    index?: number;
    fallbackErrorBoundary?: ErrorBoundaryComp;
    adHocData?: any;
  }): ReactElement => {
    const { activePathData } = props;
    if (activePathData && "fetchResponse" in activePathData) {
      return <></>;
    }

    const IS_SERVER = typeof document === "undefined";

    const context: {
      get: (str: ServerKey) => ActivePathData[ServerKey];
    } = IS_SERVER
      ? {
          get: (str: ServerKey) =>
            (props.activePathData as ActivePathData)?.[str],
        }
      : (get_hwy_client_global() as any);

    let { index } = props;
    const index_to_use = index ?? 0;
    const CurrentComponent = (context.get("activeComponents") as any)?.[
      index_to_use
    ];

    const adHocData = IS_SERVER
      ? props.adHocData
      : get_hwy_client_global().get("adHocData");

    try {
      if (!CurrentComponent) {
        return <></>;
      }

      const this_is_an_error_boundary =
        context.get("outermostErrorBoundaryIndex") === index_to_use;

      const next_outlet_is_an_error_boundary =
        context.get("outermostErrorBoundaryIndex") === index_to_use + 1;

      if (
        this_is_an_error_boundary ||
        context.get("outermostErrorBoundaryIndex") === -1
      ) {
        const ErrorBoundary: ErrorBoundaryComp | undefined =
          (context.get("activeErrorBoundaries") as any)?.[index_to_use] ??
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
            <RootOutlet
              {...local_props}
              activePathData={IS_SERVER ? props.activePathData : undefined}
              index={index_to_use + 1}
            />
          );
        };
      } else {
        Outlet =
          (context.get("activeErrorBoundaries") as any)?.[index_to_use + 1] ??
          props.fallbackErrorBoundary;

        if (!Outlet) {
          Outlet = () => <div>Error: No error boundary found.</div>;
        }
      }

      const OutletToUse = IS_SERVER
        ? Outlet
        : useCallback(Outlet, [
            (context.get("activePaths") as any)?.[index_to_use + 1],
          ]);

      const [params, setParams] = useState(context.get("params") ?? {});
      const [splatSegments, setSplatSegments] = useState(
        context.get("splatSegments") ?? [],
      );
      const [loaderData, setLoaderData] = useState(
        (context.get("activeData") as any)?.[index_to_use],
      );
      const [actionData, setActionData] = useState(
        (context.get("actionData") as any)?.[index_to_use],
      );

      useEffect(() => {
        window.addEventListener("hwy:route-change", (evt) => {
          const detail = (evt as CustomEvent).detail;
          if (typeof detail.index === "number") {
            if (detail.index === index_to_use) {
              startTransition(() => {
                setParams(context.get("params") ?? {});
                setSplatSegments(context.get("splatSegments") ?? []);
                setLoaderData(
                  (context.get("activeData") as any)?.[index_to_use],
                );
                setActionData(
                  (context.get("actionData") as any)?.[index_to_use],
                );
              });
            }
          }
        });
      }, []);

      return (
        <CurrentComponent
          {...props}
          params={params}
          splatSegments={splatSegments}
          loaderData={loaderData}
          actionData={actionData}
          Outlet={OutletToUse || <></>}
          adHocData={adHocData}
        />
      );
    } catch (error) {
      console.error(error);

      const ErrorBoundary: ErrorBoundaryComp | undefined =
        (context.get("activeErrorBoundaries") as any)
          ?.splice(0, index_to_use + 1)
          ?.reverse()
          ?.find((x: any) => x) ?? props.fallbackErrorBoundary;

      if (!ErrorBoundary) {
        return <div>Error: No error boundary found.</div>;
      }

      return <ErrorBoundary />;
    }
  },
);

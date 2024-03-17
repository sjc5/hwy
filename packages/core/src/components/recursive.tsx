import type { ReactElement } from "react";
import { memo, startTransition, useCallback, useEffect, useState } from "react";
import {
  getHwyClientGlobal,
  type ActivePathData,
} from "../../../common/index.mjs";

type ErrorBoundaryComp = () => ReactElement;

type ServerKey = keyof ActivePathData;

export function getAdHocData(): any {
  if (typeof document === "undefined") return;
  return getHwyClientGlobal().get("adHocData");
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

    const isServer = typeof document === "undefined";

    const context: {
      get: (str: ServerKey) => ActivePathData[ServerKey];
    } = isServer
      ? {
          get: (str: ServerKey) =>
            (props.activePathData as ActivePathData)?.[str],
        }
      : (getHwyClientGlobal() as any);

    let { index } = props;
    const indexToUse = index ?? 0;
    const CurrentComponent = (context.get("activeComponents") as any)?.[
      indexToUse
    ];

    const adHocData = isServer
      ? props.adHocData
      : getHwyClientGlobal().get("adHocData");

    try {
      if (!CurrentComponent) {
        return <></>;
      }

      const thisIsAnErrorBoundary =
        context.get("outermostErrorBoundaryIndex") === indexToUse;

      const nextOutletIsAnErrorBoundary =
        context.get("outermostErrorBoundaryIndex") === indexToUse + 1;

      if (
        thisIsAnErrorBoundary ||
        context.get("outermostErrorBoundaryIndex") === -1
      ) {
        const ErrorBoundary: ErrorBoundaryComp | undefined =
          (context.get("activeErrorBoundaries") as any)?.[indexToUse] ??
          props.fallbackErrorBoundary;

        if (!ErrorBoundary) {
          return <div>Error: No error boundary found.</div>;
        }

        return <ErrorBoundary />;
      }

      let Outlet;

      if (!nextOutletIsAnErrorBoundary) {
        Outlet = (localProps: Record<string, any> | undefined) => {
          return (
            <RootOutlet
              {...localProps}
              activePathData={isServer ? props.activePathData : undefined}
              index={indexToUse + 1}
            />
          );
        };
      } else {
        Outlet =
          (context.get("activeErrorBoundaries") as any)?.[indexToUse + 1] ??
          props.fallbackErrorBoundary;

        if (!Outlet) {
          Outlet = () => <div>Error: No error boundary found.</div>;
        }
      }

      const OutletToUse = isServer
        ? Outlet
        : useCallback(Outlet, [
            (context.get("activePaths") as any)?.[indexToUse + 1],
          ]);

      const [params, setParams] = useState(context.get("params") ?? {});
      const [splatSegments, setSplatSegments] = useState(
        context.get("splatSegments") ?? [],
      );
      const [loaderData, setLoaderData] = useState(
        (context.get("activeData") as any)?.[indexToUse],
      );
      const [actionData, setActionData] = useState(
        (context.get("actionData") as any)?.[indexToUse],
      );

      useEffect(() => {
        window.addEventListener("hwy:route-change", (evt) => {
          const detail = (evt as CustomEvent).detail;
          startTransition(() => {
            setParams(context.get("params") ?? {});
            setSplatSegments(context.get("splatSegments") ?? []);
            if (detail.index === indexToUse) {
              setLoaderData((context.get("activeData") as any)?.[indexToUse]);
              setActionData((context.get("actionData") as any)?.[indexToUse]);
            }
          });
        });
      }, []);

      return (
        <CurrentComponent
          {...props}
          params={params}
          splatSegments={splatSegments}
          loaderData={loaderData}
          actionData={actionData}
          Outlet={OutletToUse}
          adHocData={adHocData}
        />
      );
    } catch (error) {
      console.error(error);

      const ErrorBoundary: ErrorBoundaryComp | undefined =
        (context.get("activeErrorBoundaries") as any)
          ?.splice(0, indexToUse + 1)
          ?.reverse()
          ?.find((x: any) => x) ?? props.fallbackErrorBoundary;

      if (!ErrorBoundary) {
        return <div>Error: No error boundary found.</div>;
      }

      return <ErrorBoundary />;
    }
  },
);

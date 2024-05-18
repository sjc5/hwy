import { startTransition, useEffect, useMemo, useState } from "react";
import type { GetRouteDataOutput, RouteData } from "../../common/index.mjs";
import {
  AdHocData,
  HWY_ROUTE_CHANGE_EVENT_KEY,
  getHwyClientGlobal,
} from "../../common/index.mjs";

type ErrorBoundaryComp = () => JSX.Element;
type ServerKey = keyof GetRouteDataOutput;
type BaseProps = {
  routeData?: RouteData;
  index?: number;
  fallbackErrorBoundary?: ErrorBoundaryComp;
  adHocData?: AdHocData;
  layout?: RootLayoutComponent;
};

export function RootOutlet(props: BaseProps): JSX.Element {
  const isServer = typeof document === "undefined";
  const ctx: {
    get: (sk: ServerKey) => GetRouteDataOutput[ServerKey];
  } = isServer
    ? {
        get: (sk: ServerKey) => props.routeData?.data?.[sk],
      }
    : (getHwyClientGlobal() as any);
  const idx = props.index ?? 0;
  const CurrentComponent = (ctx.get("activeComponents") as any)?.[idx];
  const adHocData = isServer
    ? props.adHocData
    : getHwyClientGlobal().get("adHocData");
  const [params, setParams] = useState(ctx.get("params") ?? {});
  const [splatSegments, setSplatSegments] = useState(
    ctx.get("splatSegments") ?? [],
  );
  const [loaderData, setLoaderData] = useState(
    (ctx.get("loadersData") as any)?.[idx],
  );
  const [actionData, setActionData] = useState(
    (ctx.get("actionData") as any)?.[idx],
  );
  useEffect(() => {
    window.addEventListener(HWY_ROUTE_CHANGE_EVENT_KEY, () => {
      startTransition(() => {
        setParams(ctx.get("params") ?? {});
        setSplatSegments(ctx.get("splatSegments") ?? []);
        setLoaderData((ctx.get("loadersData") as any)?.[idx]);
        setActionData((ctx.get("actionData") as any)?.[idx]);
      });
    });
  }, []);

  if (!CurrentComponent) {
    return <></>;
  }

  const thisIsAnErrorBoundary = ctx.get("outermostErrorBoundaryIndex") === idx;
  const nextOutletIsAnErrorBoundary =
    ctx.get("outermostErrorBoundaryIndex") === idx + 1;
  const shouldRenderEB =
    thisIsAnErrorBoundary || ctx.get("outermostErrorBoundaryIndex") === -1;

  try {
    if (shouldRenderEB) {
      const EB = useMemo(
        () =>
          (ctx.get("activeErrorBoundaries") as any)?.[idx] ??
          props.fallbackErrorBoundary ?? (
            <div>Error: No error boundary found.</div>
          ),
        [idx],
      );

      if (props.layout && idx === 0) {
        return (
          <props.layout
            adHocData={props.adHocData}
            params={params as any}
            splatSegments={splatSegments as any}
          >
            <EB />
          </props.layout>
        );
      }

      return EB;
    }

    const Outlet = useMemo(() => {
      let Outlet;
      if (!nextOutletIsAnErrorBoundary) {
        Outlet = (localProps: Record<string, any> | undefined) => {
          return <RootOutlet {...localProps} {...props} index={idx + 1} />;
        };
      } else {
        Outlet =
          (ctx.get("activeErrorBoundaries") as any)?.[idx + 1] ??
          props.fallbackErrorBoundary;
        if (!Outlet) {
          Outlet = () => <div>Error: No error boundary found.</div>;
        }
      }
      return Outlet;
    }, [(ctx.get("importURLs") as any)?.[idx + 1]]);

    const extendedProps = useMemo(() => {
      return {
        ...props,
        params: params as any,
        splatSegments: splatSegments as any,
        loaderData,
        actionData,
        Outlet,
        adHocData,
      };
    }, [
      props,
      params,
      splatSegments,
      loaderData,
      actionData,
      Outlet,
      adHocData,
    ]);

    return (
      <MaybeWithLayout {...extendedProps}>
        <CurrentComponent {...extendedProps} />
      </MaybeWithLayout>
    );
  } catch (error) {
    console.error(error);
    return (
      <MaybeWithLayout
        {...props}
        adHocData={props.adHocData}
        params={params as any}
        splatSegments={splatSegments as any}
        children={useMemo(() => {
          return (
            (ctx.get("activeErrorBoundaries") as any)
              ?.splice(0, idx + 1)
              ?.reverse()
              ?.find((x: any) => x) ??
            props.fallbackErrorBoundary ?? (
              <div>Error: No error boundary found.</div>
            )
          );
        }, [idx])}
      />
    );
  }
}

function MaybeWithLayout(
  props: BaseProps & RootLayoutComponentProps & { children: JSX.Element },
): JSX.Element {
  if (props.layout && !props.index) {
    return (
      <props.layout
        adHocData={props.adHocData}
        params={props.params as any}
        splatSegments={props.splatSegments as any}
      >
        {props.children}
      </props.layout>
    );
  }
  return props.children;
}

type RoutePropsTypeArg = {
  loaderOutput?: any;
  actionOutput?: any;
};

type DefaultRouteProps = {
  loaderOutput: any;
  actionOutput: any;
};

export type RouteComponentProps<
  T extends RoutePropsTypeArg = DefaultRouteProps,
> = {
  loaderData: T["loaderOutput"];
  actionData: T["actionOutput"] | undefined;
  Outlet: (...props: any) => JSX.Element;
  params: Record<string, string>;
  splatSegments: Array<string>;
  adHocData: AdHocData | undefined;
};

export type RouteComponent<T extends RoutePropsTypeArg = DefaultRouteProps> = (
  props: RouteComponentProps<T>,
) => JSX.Element;

export type RootLayoutComponentProps = {
  children: JSX.Element;
} & Pick<RouteComponentProps, "params" | "splatSegments" | "adHocData">;

export type RootLayoutComponent = (
  props: RootLayoutComponentProps,
) => JSX.Element;

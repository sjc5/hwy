import { html, LitElement, TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import {
  getHwyClientGlobal,
  HWY_ROUTE_CHANGE_EVENT_KEY,
  RouteChangeEvent,
  RouteData,
} from "../../common/index.mjs";
import { AsComp, makeComp } from "./utils.js";

type ErrorBoundaryComp = () => TemplateResult;
type BaseProps<AHD extends any = any> = {
  routeData?: RouteData<AHD>;
  index?: number;
  fallbackErrorBoundary?: ErrorBoundaryComp;
  adHocData?: AHD;
  layout?: AsComp<typeof HwyRootLayout<{ adHocData: AHD }>>;
};

const noErrorBoundaryTmpl = html`<div>Error: No error boundary found.</div>`;
const noErrorBoundaryTmplFn = () => noErrorBoundaryTmpl;

let shouldScroll = false;

class HwyRootOutletShadowDef<AHD> extends LitElement {
  @property({ type: Object })
  routeData?: RouteData<AHD>;

  @property({ type: Number })
  index?: number = 0;

  @property({ type: Function })
  fallbackErrorBoundary?: ErrorBoundaryComp;

  @property({ type: Object })
  adHocData?: AHD;

  @property({ type: Function })
  layout?: AsComp<typeof HwyRootLayout>;

  @property({ type: Object })
  passedFromParent?: Record<string, any>;

  private _routeChangeCallback = (e: RouteChangeEvent) => {
    this.requestUpdate();

    if (e.detail.scrollState) {
      shouldScroll = true;
      window.requestAnimationFrame(() => {
        if (shouldScroll) {
          window.scrollTo(e.detail.scrollState!.x, e.detail.scrollState!.y);
          shouldScroll = false;
        }
      });
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(
      HWY_ROUTE_CHANGE_EVENT_KEY,
      this._routeChangeCallback as any,
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(
      HWY_ROUTE_CHANGE_EVENT_KEY,
      this._routeChangeCallback as any,
    );
  }

  render() {
    const ctx = getHwyClientGlobal();
    const idx = this.index ?? 0;
    const CurrentComponent = ctx.get("activeComponents")?.[idx];

    const EB = () =>
      ctx.get("activeErrorBoundaries")?.[idx] ??
      this.fallbackErrorBoundary ??
      noErrorBoundaryTmpl;

    let Outlet;

    const nextOutletIsAnErrorBoundary =
      ctx.get("outermostErrorIndex") === idx + 1;

    if (!nextOutletIsAnErrorBoundary) {
      Outlet = (localProps: Record<string, any> | undefined) => {
        const roProps = {
          passedFromParent: localProps,
          routeData: this.routeData,
          fallbackErrorBoundary: this.fallbackErrorBoundary,
          adHocData: this.adHocData,
          index: idx + 1,
        };
        return HwyRootOutlet(roProps);
      };
    } else {
      Outlet =
        ctx.get("activeErrorBoundaries")?.[idx + 1] ??
        this.fallbackErrorBoundary ??
        noErrorBoundaryTmplFn;
    }

    const extendedProps = {
      passedFromParent: this.passedFromParent,
      routeData: this.routeData,
      index: idx,
      fallbackErrorBoundary: this.fallbackErrorBoundary,
      layout: this.layout,
      params: ctx.get("params") ?? {},
      splatSegments: ctx.get("splatSegments") ?? [],
      loaderData: ctx.get("loadersData")?.[idx],
      actionData: ctx.get("actionData")?.[idx],
      Outlet,
      adHocData: ctx.get("adHocData") ?? this.adHocData,
    };

    const ebc = () => {
      return (
        ctx
          .get("activeErrorBoundaries")
          ?.splice(0, idx + 1)
          ?.reverse()
          ?.find((x: any) => x) ??
        this.fallbackErrorBoundary ??
        noErrorBoundaryTmpl
      );
    };

    if (!CurrentComponent) {
      return html``;
    }

    try {
      if (ctx.get("outermostErrorIndex") === idx) {
        if (this.layout && idx === 0) {
          return this.layout({
            adHocData: ctx.get("adHocData") ?? this.adHocData,
            params: ctx.get("params") ?? {},
            splatSegments: ctx.get("splatSegments") ?? [],
            childTemplate: EB(),
          });
        }

        return EB();
      }

      return MaybeWithLayout({
        ...extendedProps,
        childTemplate: CurrentComponent(extendedProps),
      });
    } catch (error) {
      console.error(error);

      return MaybeWithLayout({
        ...extendedProps,
        childTemplate: ebc(),
      });
    }
  }
}

export const HwyRootOutletShadow = makeComp(
  HwyRootOutletShadowDef,
  "hwy-root-outlet-shadow",
);

class HwyRootOutletDef<AHD> extends HwyRootOutletShadowDef<AHD> {
  createRenderRoot() {
    return this;
  }
}

export const HwyRootOutlet = makeComp(HwyRootOutletDef, "hwy-root-outlet");

function MaybeWithLayout(
  props: BaseProps & HwyRootLayoutProps & { childTemplate: TemplateResult },
): TemplateResult {
  if (props.layout && !props.index) {
    return props.layout(props);
  }
  return props.childTemplate;
}

type RoutePropsTypeArg = {
  loaderOutput?: any;
  actionOutput?: any;
  adHocData?: any;
};

type DefaultRouteProps = {
  loaderOutput: any;
  actionOutput: any;
  adHocData: any;
};

export type HwyRouteComponentProps<
  T extends RoutePropsTypeArg = DefaultRouteProps,
> = {
  loaderData: T["loaderOutput"];
  actionData: T["actionOutput"] | undefined;
  Outlet: (passToChild?: Record<string, any>) => TemplateResult;
  params: Record<string, string>;
  splatSegments: Array<string>;
  adHocData: T["adHocData"] | undefined;
};

export type HwyRouteComponent<T extends RoutePropsTypeArg = DefaultRouteProps> =
  (props: HwyRouteComponentProps<T>) => TemplateResult;

export type HwyRootLayoutProps<
  T extends RoutePropsTypeArg = DefaultRouteProps,
> = {
  childTemplate: TemplateResult;
} & Pick<HwyRouteComponentProps<T>, "params" | "splatSegments" | "adHocData">;

export class HwyRouteShadow<
  T extends RoutePropsTypeArg = DefaultRouteProps,
> extends LitElement {
  @property({ type: Object })
  loaderData!: T["loaderOutput"];

  @property({ type: Object })
  actionData?: T["actionOutput"];

  @property({ type: Function })
  Outlet!: (...props: any) => TemplateResult;

  @property({ type: Object })
  params!: Record<string, string>;

  @property({ type: Array })
  splatSegments!: Array<string>;

  @property({ type: Object })
  adHocData?: T["adHocData"];

  @property({ type: Object })
  passedFromParent?: Record<string, any>;
}

export class HwyRoute<
  T extends RoutePropsTypeArg = DefaultRouteProps,
> extends HwyRouteShadow<T> {
  createRenderRoot() {
    return this;
  }
}

export class HwyRootLayoutShadow<
  T extends RoutePropsTypeArg = DefaultRouteProps,
> extends LitElement {
  @property({ type: Object })
  params!: Record<string, string>;

  @property({ type: Array })
  splatSegments!: Array<string>;

  @property({ type: Object })
  adHocData?: T["adHocData"];

  @property({ type: Function })
  childTemplate!: TemplateResult;
}

export class HwyRootLayout<
  T extends RoutePropsTypeArg = DefaultRouteProps,
> extends HwyRootLayoutShadow<T> {
  createRenderRoot() {
    return this;
  }
}

import { LitElement, type TemplateResult, html } from "lit";
import { property } from "lit/decorators.js";
import {
	HWY_ROUTE_CHANGE_EVENT_KEY,
	type RouteChangeEvent,
	type RouteData,
	getHwyClientGlobal,
} from "../../common/index.mjs";
import { type AsComp, makeComp } from "./utils.js";

type ErrorBoundaryComp = () => TemplateResult;
type BaseProps<AHD = any> = {
	routeData?: RouteData<AHD>;
	index?: number;
	fallbackErrorBoundary?: ErrorBoundaryComp;
	adHocData?: AHD;
	layout?: AsComp<typeof HwyLayout<{ adHocData: AHD }>>;
};

const noErrorBoundaryTmpl = html`<div>Error: No error boundary found.</div>`;
const noErrorBoundaryTmplFn = () => noErrorBoundaryTmpl;

let shouldScroll = false;

class HwyRootOutletShadowDef<AHD> extends LitElement {
	@property()
	routeData?: RouteData<AHD>;

	@property()
	index?: number = 0;

	@property()
	fallbackErrorBoundary?: ErrorBoundaryComp;

	@property()
	adHocData?: AHD;

	@property()
	layout?: AsComp<typeof HwyLayout>;

	@property()
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
						Outlet: EB,
					});
				}

				return EB();
			}

			return MaybeWithLayout({
				...extendedProps,
				Outlet: (localProps: Record<string, any> | undefined) =>
					CurrentComponent({
						...extendedProps,
						passedFromParent: localProps,
					}),
			});
		} catch (error) {
			console.error(error);

			return MaybeWithLayout({
				...extendedProps,
				Outlet: ebc,
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
	props: BaseProps & HwyLayoutProps & { Outlet: Outlet },
): TemplateResult {
	if (props.layout && !props.index) {
		return props.layout(props);
	}
	return props.Outlet();
}

type RoutePropsTypeArg = {
	loaderData?: any;
	adHocData?: any;
};

type DefaultRouteProps = {
	loaderData: any;
	adHocData: any;
};

type Outlet = (passToChild?: Record<string, any>) => TemplateResult;

export type HwyRouteComponentProps<
	T extends RoutePropsTypeArg = DefaultRouteProps,
> = {
	loaderData: T["loaderData"];
	Outlet: Outlet;
	params: Record<string, string>;
	splatSegments: Array<string>;
	adHocData: T["adHocData"] | undefined;
};

export type HwyRouteComponent<T extends RoutePropsTypeArg = DefaultRouteProps> =
	(props: HwyRouteComponentProps<T>) => TemplateResult;

export type HwyLayoutProps<T extends RoutePropsTypeArg = DefaultRouteProps> = {
	Outlet: Outlet;
} & Pick<HwyRouteComponentProps<T>, "params" | "splatSegments" | "adHocData">;

export class HwyRouteShadow<
	T extends RoutePropsTypeArg = DefaultRouteProps,
> extends LitElement {
	@property()
	loaderData!: T["loaderData"];

	@property()
	Outlet!: (...props: any) => TemplateResult;

	@property()
	params!: Record<string, string>;

	@property()
	splatSegments!: Array<string>;

	@property()
	adHocData?: T["adHocData"];

	@property()
	passedFromParent?: Record<string, any>;
}

export class HwyRoute<
	T extends RoutePropsTypeArg = DefaultRouteProps,
> extends HwyRouteShadow<T> {
	createRenderRoot() {
		return this;
	}
}

export class HwyLayoutShadow<
	T extends RoutePropsTypeArg = DefaultRouteProps,
> extends LitElement {
	@property()
	params!: Record<string, string>;

	@property()
	splatSegments!: Array<string>;

	@property()
	adHocData?: T["adHocData"];

	@property()
	Outlet!: Outlet;
}

export class HwyLayout<
	T extends RoutePropsTypeArg = DefaultRouteProps,
> extends HwyLayoutShadow<T> {
	createRenderRoot() {
		return this;
	}
}

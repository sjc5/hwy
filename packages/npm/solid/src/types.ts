import type { JSX } from "solid-js/jsx-runtime";

import type {
	DefaultRoutePropsTypeArg,
	RoutePropsTypeArg,
	Shared,
} from "../../client/src/impl_helpers.ts";

type S<T extends RoutePropsTypeArg> = Shared<JSX.Element, T>;
type D = DefaultRoutePropsTypeArg;

export type HwyRouteProps<T extends RoutePropsTypeArg = D> = S<T>["RouteProps"];
export type HwyRoute<T extends RoutePropsTypeArg = D> = S<T>["Route"];

import type { JSX } from "react";

import type {
	DefaultRoutePropsTypeArg,
	RoutePropsTypeArg,
	Shared,
} from "../../client/src/impl_helpers.ts";

type S<T extends RoutePropsTypeArg> = Shared<JSX.Element, T>;
type D = DefaultRoutePropsTypeArg;

export type RiverRouteProps<T extends RoutePropsTypeArg = D> = S<T>["RouteProps"];
export type RiverRoute<T extends RoutePropsTypeArg = D> = S<T>["Route"];

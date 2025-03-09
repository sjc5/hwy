import type { JSX } from "react";

import type {
	DefaultRouteProps,
	RoutePropsTypeArg,
	Shared,
} from "../../client/src/impl_helpers.ts";

export type HwyRouteProps<T extends RoutePropsTypeArg = DefaultRouteProps> = Shared<
	JSX.Element,
	T
>["HwyRouteProps"];

export type HwyRoute<T extends RoutePropsTypeArg = DefaultRouteProps> = Shared<
	JSX.Element,
	T
>["HwyRoute"];

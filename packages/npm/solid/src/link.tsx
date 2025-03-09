import { type JSX, createMemo } from "solid-js";
import { type LinkPropsBase, makeFinalLinkProps } from "../../client/src/impl_helpers.ts";

export function Link(
	props: JSX.AnchorHTMLAttributes<HTMLAnchorElement> &
		LinkPropsBase<JSX.CustomEventHandlersCamelCase<HTMLAnchorElement>["onClick"]>,
) {
	const finalLinkProps = createMemo(() => makeFinalLinkProps(props));

	return (
		<a
			data-external={finalLinkProps().dataExternal}
			{...props}
			onPointerEnter={finalLinkProps().onPointerEnter}
			onFocus={finalLinkProps().onFocus}
			onPointerLeave={finalLinkProps().onPointerLeave}
			onBlur={finalLinkProps().onBlur}
			// biome-ignore lint:
			onClick={finalLinkProps().onClick}
		>
			{props.children}
		</a>
	);
}

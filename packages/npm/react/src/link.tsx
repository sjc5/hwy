import { type ComponentProps, useMemo } from "react";
import { type LinkPropsBase, makeFinalLinkProps } from "../../client/src/impl_helpers.ts";

export function Link(
	props: ComponentProps<"a"> &
		LinkPropsBase<(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void | Promise<void>>,
) {
	const finalLinkProps = useMemo(() => makeFinalLinkProps(props), [props]);

	return (
		<a
			data-external={finalLinkProps.dataExternal}
			{...props}
			onPointerEnter={finalLinkProps.onPointerEnter}
			onFocus={finalLinkProps.onFocus}
			onPointerLeave={finalLinkProps.onPointerLeave}
			onBlur={finalLinkProps.onBlur}
			// biome-ignore lint:
			onClick={finalLinkProps.onClick}
		>
			{props.children}
		</a>
	);
}

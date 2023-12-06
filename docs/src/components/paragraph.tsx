import type { ChildrenPermissive } from "../types.js";
import type { JSX } from "preact";

function Paragraph({
  children,
  ...rest
}: { children: ChildrenPermissive } & JSX.IntrinsicElements["p"]) {
  return (
    // @ts-ignore
    <p {...rest} style={{ lineHeight: 1.75, ...rest.style }}>
      {children}
    </p>
  );
}

export { Paragraph };

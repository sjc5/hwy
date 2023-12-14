import type { JSX } from "preact";
import { ChildrenPermissive } from "../types.js";

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

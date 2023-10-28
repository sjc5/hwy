import { ChildrenPermissive } from "../types.js";

function Paragraph({
  children,
  ...rest
}: { children: ChildrenPermissive } & JSX.IntrinsicElements["p"]) {
  return (
    <p {...rest} style={{ lineHeight: 1.75, ...rest.style }}>
      {children}
    </p>
  );
}

export { Paragraph };

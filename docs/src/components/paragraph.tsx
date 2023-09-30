import { ChildrenPermissive } from "../types.js";
import { cx } from "../utils/utils.js";

function Paragraph({
  children,
  ...rest
}: { children: ChildrenPermissive } & JSX.IntrinsicElements["p"]) {
  return (
    <p {...rest} class={cx("leading-7", rest.class)}>
      {children}
    </p>
  );
}

export { Paragraph };

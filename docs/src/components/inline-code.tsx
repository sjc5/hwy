import { cx } from "../utils/utils.js";
import type { JSX } from "preact";

function InlineCode({
  children,
  high_contrast,
  ...rest
}: {
  children: string;
  high_contrast?: boolean;
} & JSX.IntrinsicElements["code"]) {
  return (
    <code
      {...rest}
      // @ts-ignore
      class={cx("inline-code", high_contrast && "high-contrast", rest.class)}
    >
      {children}
    </code>
  );
}

export { InlineCode };

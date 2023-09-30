import { cx } from "../utils/utils.js";

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
      class={cx(
        "py-[2px] px-1 whitespace-nowrap",
        high_contrast
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "bg-[#7772] dark:bg-[#7773] rounded",
        rest.class,
      )}
    >
      {children}
    </code>
  );
}

export { InlineCode };

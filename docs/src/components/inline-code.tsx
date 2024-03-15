import { cx } from "../utils/utils.js";

function InlineCode({
  children,
  high_contrast,
  style,
}: {
  children: string;
  high_contrast?: boolean;
  style?: Record<string, any>;
}) {
  return (
    <code
      className={cx("inline-code", high_contrast && "high-contrast")}
      style={style}
    >
      {children}
    </code>
  );
}

export { InlineCode };

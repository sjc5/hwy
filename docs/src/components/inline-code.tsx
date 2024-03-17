import { cx } from "../utils/utils.js";

function InlineCode({
  children,
  highContrast,
  style,
}: {
  children: string;
  highContrast?: boolean;
  style?: Record<string, any>;
}) {
  return (
    <code
      className={cx("inline-code", highContrast && "high-contrast")}
      style={style}
    >
      {children}
    </code>
  );
}

export { InlineCode };

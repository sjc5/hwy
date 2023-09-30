import { ChildrenPermissive } from "../types.js";
import { cx } from "../utils/utils.js";

function UnorderedList({
  children,
  ...rest
}: { children: ChildrenPermissive } & JSX.IntrinsicElements["ul"]) {
  return (
    <ul {...rest} class={cx("space-y-6", rest.class)}>
      {children}
    </ul>
  );
}

function ListItem({
  children,
  ...rest
}: { children: ChildrenPermissive } & JSX.IntrinsicElements["li"]) {
  return (
    <li {...rest} class={cx("list-disc ml-6 pl-1 leading-7", rest.class)}>
      {children}
    </li>
  );
}

export { UnorderedList, ListItem };

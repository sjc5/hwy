import type { ChildrenPermissive } from "../types.js";
import { cx } from "../utils/utils.js";
import type { JSX } from "preact";

function UnorderedList({
  children,
  ...rest
}: { children: ChildrenPermissive } & JSX.IntrinsicElements["ul"]) {
  return (
    // @ts-ignore
    <ul {...rest} class={cx("flex-col-wrapper-bigger", rest.class)}>
      {children}
    </ul>
  );
}

function ListItem({
  children,
  ...rest
}: { children: ChildrenPermissive } & JSX.IntrinsicElements["li"]) {
  return (
    // @ts-ignore
    <li {...rest} class={cx("list-item", rest.class)}>
      {children}
    </li>
  );
}

export { UnorderedList, ListItem };

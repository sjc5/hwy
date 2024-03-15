import { cx } from "../utils/utils.js";

function UnorderedList({
  children,
  style,
}: {
  children: any;
  style?: Record<string, any>;
}) {
  return (
    <ul className={"flex-col-wrapper-bigger"} style={style}>
      {children}
    </ul>
  );
}

function ListItem({
  children,
  style,
}: {
  children: any;
  style?: Record<string, any>;
}) {
  return (
    <li className={"list-item"} style={style}>
      {children}
    </li>
  );
}

export { ListItem, UnorderedList };

import { jsx as _jsx } from "hono/jsx/jsx-runtime";
import { cx } from "../utils/utils.js";
function UnorderedList({ children, ...rest }) {
    return (_jsx("ul", { ...rest, class: cx("space-y-6", rest.class), children: children }));
}
function ListItem({ children, ...rest }) {
    return (_jsx("li", { ...rest, class: cx("list-disc ml-6 pl-1 leading-7", rest.class), children: children }));
}
export { UnorderedList, ListItem };

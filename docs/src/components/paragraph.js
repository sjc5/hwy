import { jsx as _jsx } from "hono/jsx/jsx-runtime";
import { cx } from "../utils/utils.js";
function Paragraph({ children, ...rest }) {
    return (_jsx("p", { ...rest, class: cx("leading-7", rest.class), children: children }));
}
export { Paragraph };

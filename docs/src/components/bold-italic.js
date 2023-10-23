import { jsx as _jsx } from "hono/jsx/jsx-runtime";
function Boldtalic({ children }) {
    return (_jsx("b", { children: _jsx("i", { children: children }) }));
}
export { Boldtalic };

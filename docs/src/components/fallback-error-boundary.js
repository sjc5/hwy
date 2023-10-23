import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
import { Paragraph } from "./paragraph.js";
function FallbackErrorBoundary(props) {
    return (_jsxs("div", { class: "space-y-4", children: [_jsx(Paragraph, { children: "Whoops, something went wrong. Sorry about that." }), _jsx(Paragraph, { children: "If you're feeling generous, please file an issue telling us what happened." })] }));
}
export { FallbackErrorBoundary };

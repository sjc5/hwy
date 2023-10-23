import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
function DialogModal({ open_button_inner, dialog_inner, wrapper_class, open_button_class, }) {
    return (_jsxs("div", { "hx-boost": "false", class: wrapper_class, children: [_jsx("button", { onclick: `this.nextElementSibling.showModal()`, class: open_button_class, children: open_button_inner }), _jsx("dialog", { onclick: "event.target==this && this.close()", style: {
                    padding: String(0),
                    border: "none",
                    background: "transparent",
                }, children: _jsx("form", { method: "dialog", children: dialog_inner }) })] }));
}
export { DialogModal };

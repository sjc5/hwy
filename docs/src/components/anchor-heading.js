import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
function AnchorHeading({ content }) {
    const slugified = encodeURIComponent(content.toLowerCase().replace(/ /g, "-"));
    return (_jsxs("div", { class: "flex gap-3 text-xl font-bold pt-4", id: slugified, children: [_jsx("a", { class: "hover:underline text-[#777] hover:text-[unset]", href: `#${slugified}`, children: "#" }), content] }));
}
export { AnchorHeading };

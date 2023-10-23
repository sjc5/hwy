import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
function Nav() {
    return (_jsxs("nav", { class: "flex-wrap mt-6 mb-12 items-center flex justify-between", children: [_jsx("a", { href: "/", class: "hover:text-orange-700 hover:dark:text-orange-300 font-bold text-2xl mr-2 h-[33px] flex items-center leading-none", children: _jsx("h1", { children: "Hwy" }) }), _jsxs("div", { class: "flex", children: [_jsx("a", { href: "/docs", class: "px-2 rounded hover:bg-blue-500 hover:text-white uppercase h-[33px] flex items-center leading-none font-bold", title: "Hwy Documentation", children: "Docs" }), _jsx("a", { href: "https://github.com/hwy-js/hwy", target: "_blank", class: "px-2 rounded hover:bg-blue-500 hover:text-white uppercase h-[33px] flex items-center leading-none font-bold", title: "Star on GitHub", children: "\u2B50 GitHub" })] })] }));
}
export { Nav };

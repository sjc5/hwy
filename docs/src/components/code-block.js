import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
const lang_map = { typescript, bash, json };
function CodeBlock({ language, code }) {
    hljs.registerLanguage(language, lang_map[language]);
    return (_jsxs("pre", { class: "overflow-x-auto rounded-2xl bg-slate-800 border-4 border-solid border-[#7777] py-4 px-5 max-w-full flex gap-5 text-white", children: [_jsx("code", { class: `language-${language}`, dangerouslySetInnerHTML: {
                    __html: hljs.highlight(code.trim(), { language }).value,
                } }), _jsx("div", {})] }));
}
export { CodeBlock };

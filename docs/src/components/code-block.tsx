import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";

const lang_map = { typescript, bash, json };
type Language = keyof typeof lang_map;

function CodeBlock({ language, code }: { language: Language; code: string }) {
  hljs.registerLanguage(language, lang_map[language]);

  return (
    <pre class="overflow-x-auto rounded-2xl bg-slate-800 border-4 border-solid border-[#7777] py-4 px-5 max-w-full flex gap-5 text-white">
      <code
        class={`language-${language}`}
        dangerouslySetInnerHTML={{
          __html: hljs.highlight(code.trim(), { language }).value,
        }}
      />
      <div />
    </pre>
  );
}

export { CodeBlock };

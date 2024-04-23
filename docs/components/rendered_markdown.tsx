import { fromHighlighter } from "@shikijs/markdown-it/core";
import MarkdownIt from "markdown-it";
import { getHighlighterCore } from "shiki/core";

const highlighter = await getHighlighterCore({
	themes: [import("shiki/themes/vitesse-dark.mjs")],
	langs: [
		import("shiki/langs/tsx.mjs"),
		import("shiki/langs/bash.mjs"),
		import("shiki/langs/jsonc.mjs"),
	],
	loadWasm: import("shiki/wasm"),
});

const md = MarkdownIt({ html: true });

md.use(fromHighlighter(highlighter as any, { theme: "vitesse-dark" }));

export type MdObj = { title: string; content: string };

export function RenderedMarkdown({ grayMatterObj }: { grayMatterObj: MdObj }) {
	let html = grayMatterObj.title ? `<h1>${grayMatterObj.title}</h1>` : "";
	html += grayMatterObj.content ? md.render(grayMatterObj.content) : "";
	return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

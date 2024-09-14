import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import { useEffect } from "preact/hooks";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);

export function RenderedMarkdown({ grayMatterObj }: { grayMatterObj: MdObj }) {
	const title = grayMatterObj.title ? `<h1>${grayMatterObj.title}</h1>` : "";
	const html = title + grayMatterObj.content;
	useEffect(hljs.highlightAll, [grayMatterObj]);
	return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export type MdObj = { title: string; content: string };

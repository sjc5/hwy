import Shiki from "@shikijs/markdown-it";
import MarkdownIt from "markdown-it";

const md = MarkdownIt({ html: true });

md.use(
  await Shiki({
    theme: "vitesse-dark",
  }),
);

type AnyObj = { [key: string]: any };
export type MdObj = { data: AnyObj; content: string };

export function RenderedMarkdown({ grayMatterObj }: { grayMatterObj: MdObj }) {
  let html = grayMatterObj.data.title
    ? `<h1>${grayMatterObj.data.title}</h1>`
    : "";

  html += grayMatterObj.content ? md.render(grayMatterObj.content) : "";

  return (
    <div
      className="content-section revert-padding markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

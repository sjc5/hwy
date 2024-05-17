import type { UIProps } from "@hwy-js/react";
import { RenderedMarkdown } from "../components/rendered_markdown.js";

export default function (props: UIProps) {
  return <RenderedMarkdown grayMatterObj={props.loaderData} />;
}

import type { UIProps } from "@hwy-js/react";
import { RenderedMarkdown } from "../components/rendered_markdown.js";
import { CatchallLoader } from "./$.data.js";

export default function (props: UIProps<CatchallLoader>) {
  return <RenderedMarkdown grayMatterObj={props.loaderData} />;
}

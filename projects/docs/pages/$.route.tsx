import type { RouteComponentProps } from "@hwy-js/react";
import { RenderedMarkdown } from "../components/rendered_markdown.js";

export default function (props: RouteComponentProps) {
  return <RenderedMarkdown grayMatterObj={props.loaderData} />;
}

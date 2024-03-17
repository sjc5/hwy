import matter from "gray-matter";
import type { DataProps } from "hwy";
import fs from "node:fs/promises";
import path from "node:path";
import { MdObj } from "../components/rendered_markdown.js";

export async function loader(ctx: DataProps): Promise<MdObj> {
  const providedPath = ctx.splatSegments.join("/");
  let normalizedPath = path.normalize(providedPath);
  if (normalizedPath == ".") {
    normalizedPath = "README";
  }
  const filePath = `./markdown/${normalizedPath}.md`;
  const str = await fs.readFile(filePath, "utf-8");
  const gmObj = matter(str);
  return { data: gmObj.data, content: gmObj.content };
}

export type CatchallLoader = typeof loader;

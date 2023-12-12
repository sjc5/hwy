export { HonoHeadElements as HeadElements } from "./src/hono-head-elements-comp.js";
export { HonoRootOutlet as RootOutlet } from "./src/hono-recursive.js";
export { honoRenderRoot as renderRoot } from "./src/hono-render-root.js";

////////////////////////////////////////////////

import {
  GenericPageProps,
  GenericPageComponent,
  Loader,
  Action,
} from "../common/index.mjs";
import { FC } from "hono/jsx";

export type PageProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
> = GenericPageProps<FC, LoaderType, ActionType>;

export type PageComponent<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
> = GenericPageComponent<FC, JSX.Element, LoaderType, ActionType>;

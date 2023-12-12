export { PreactHeadElements as HeadElements } from "./src/preact-head-elements-comp.js";
export { preactRenderRoot as renderRoot } from "./src/preact-render-root.js";

////////////////////////////////////////////////

import {
  GenericPageProps,
  GenericPageComponent,
  Loader,
  Action,
} from "../common/index.mjs";
import { FunctionComponent, JSX } from "preact";

export type PageProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
> = GenericPageProps<FunctionComponent, LoaderType, ActionType>;

export type PageComponent<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
> = GenericPageComponent<
  FunctionComponent,
  JSX.Element,
  LoaderType,
  ActionType
>;

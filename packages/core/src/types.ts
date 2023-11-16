import type { Context, Env } from "hono";
import type { HtmlEscapedString } from "hono/utils/html";
import type { getMatchingPathData } from "../index.js";

type DataProps<EnvType extends Env = {}> = {
  c: Context<EnvType>;
  params: Record<string, string>;
  splatSegments: string[];
};

type Loader<EnvType extends Env = {}> = (
  args: DataProps<EnvType>,
) => Promise<any> | any;

type Action<EnvType extends Env = {}> = (
  args: DataProps<EnvType>,
) => Promise<any> | any;

type PageProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = {
  loaderData: Awaited<ReturnType<LoaderType>>;
  actionData: Awaited<ReturnType<ActionType>> | undefined;
  Outlet: (props?: Record<string, any>) => Promise<HtmlEscapedString>;
  c: Context<EnvType>;
  params: Record<string, string>;
  splatSegments: string[];
};

type ErrorBoundaryProps<EnvType extends Env = {}> = {
  error: unknown;
} & DataProps<EnvType>;

type PageComponent<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = (
  props: PageProps<LoaderType, ActionType, EnvType>,
) => Promise<HtmlEscapedString>;

type HeadBlock =
  | { title: string }
  | { tag: string; props: Record<string, string> };

type HeadProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = Omit<PageProps<LoaderType, ActionType, EnvType>, "Outlet">;

type HeadFunction<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = (props: HeadProps<LoaderType, ActionType, EnvType>) => Array<HeadBlock>;

type ActivePathData = Awaited<ReturnType<typeof getMatchingPathData>>;

export type {
  DataProps,
  Loader,
  Action,
  PageProps,
  PageComponent,
  HeadBlock,
  HeadProps,
  HeadFunction,
  ErrorBoundaryProps,
  ActivePathData,
};

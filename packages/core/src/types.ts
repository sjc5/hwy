import type { Context, Env } from "hono";
import type { HtmlEscapedString } from "hono/utils/html";

type DataFunctionArgs<EnvType extends Env = {}> = {
  c: Context<EnvType>;
  params: Record<string, string>;
  splatSegments: string[];
};

type DataProps<EnvType extends Env = {}> = DataFunctionArgs<EnvType>;

type Loader<EnvType extends Env = {}> = (
  args: DataFunctionArgs<EnvType>,
) => Promise<any> | any;

type Action<EnvType extends Env = {}> = (
  args: DataFunctionArgs<EnvType>,
) => Promise<any> | any;

type PageProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = {
  loaderData: Awaited<ReturnType<LoaderType>>;
  actionData: Awaited<ReturnType<ActionType>> | undefined;
  outlet: (props?: Record<string, any>) => Promise<HtmlEscapedString>;
  c: Context<EnvType>;
  params: Record<string, string>;
  splatSegments: string[];
};

type ErrorBoundaryProps<EnvType extends Env = {}> = {
  error: unknown;
} & DataFunctionArgs<EnvType>;

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
> = Omit<PageProps<LoaderType, ActionType, EnvType>, "outlet">;

type HeadFunction<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = (props: HeadProps<LoaderType, ActionType, EnvType>) => Array<HeadBlock>;

export type {
  DataFunctionArgs,
  DataProps, // same as DataFunctionArgs, just a nicer name
  Loader,
  Action,
  PageProps,
  PageComponent,
  HeadBlock,
  HeadProps,
  HeadFunction,
  ErrorBoundaryProps,
};

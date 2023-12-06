import type { Context, Env } from "hono";
import type { getMatchingPathData } from "../index.js";
import type { FunctionComponent, JSX } from "preact";

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
> = {
  loaderData: Awaited<ReturnType<LoaderType>>;
  actionData: Awaited<ReturnType<ActionType>> | undefined;
  Outlet: FunctionComponent<Record<string, any>>;
  params: Record<string, string>;
  splatSegments: string[];
  path: string;
};

type ErrorBoundaryProps = {
  error: unknown;
};

type PageComponent<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
> = (props: PageProps<LoaderType, ActionType>) => JSX.Element;

type HeadBlock =
  | { title: string }
  | { tag: string; props: Record<string, string> };

type HeadProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = Omit<PageProps<LoaderType, ActionType>, "Outlet"> & {
  c: Context<EnvType>;
};

type HeadFunction<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
  EnvType extends Env = {},
> = (props: HeadProps<LoaderType, ActionType, EnvType>) => Array<HeadBlock>;

type ActivePathData = Awaited<ReturnType<typeof getMatchingPathData>>;

export type {
  // CLIENT
  PageProps,
  PageComponent,

  // SERVER
  DataProps,
  Loader,
  Action,
  HeadBlock,
  HeadProps,
  HeadFunction,
  ErrorBoundaryProps,
  ActivePathData,
};

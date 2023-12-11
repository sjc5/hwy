import type { Context, Env } from "hono";
import type { FunctionComponent, JSX } from "preact";
import type {
  ActivePathData,
  ErrorBoundaryProps,
  HeadBlock,
} from "../../common/index.mjs";

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

type PageComponent<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>,
> = (props: PageProps<LoaderType, ActionType>) => JSX.Element;

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

import type { Context, Env } from 'hono'

type DataFunctionArgs<EnvType extends Env = {}> = {
  c: Context<EnvType>
  params: Record<string, string>
  splatSegments: string[]
}

type Loader<EnvType extends Env = {}> = (
  args: DataFunctionArgs<EnvType>
) => Promise<any> | any

type Action<EnvType extends Env = {}> = (
  args: DataFunctionArgs<EnvType>
) => Promise<any> | any

type PageProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>
> = {
  loaderData: Awaited<ReturnType<LoaderType>>
  actionData: Awaited<ReturnType<ActionType>> | undefined
  outlet: (props?: Record<string, any>) => Promise<JSX.Element>
  path: string | undefined
  c: Context
  params: Record<string, string>
  splatSegments: string[]
}

type ErrorBoundaryProps<EnvType extends Env = {}> = {
  error: unknown
} & DataFunctionArgs<EnvType>

type PageComponent<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>
> = (props: PageProps<LoaderType, ActionType>) => Promise<JSX.Element>

type HeadBlock =
  | { title: string }
  | { tag: string; props: Record<string, string> }

type HeadProps<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>
> = Omit<PageProps<LoaderType, ActionType>, 'outlet'>

type HeadFunction<
  LoaderType extends Loader<any> = Loader<any>,
  ActionType extends Action<any> = Action<any>
> = (props: HeadProps<LoaderType, ActionType>) => Array<HeadBlock>

type HtmlEscapedString = string & {
  isEscaped: true
}

export type {
  DataFunctionArgs,
  Loader,
  Action,
  PageProps,
  PageComponent,
  HtmlEscapedString,
  HeadBlock,
  HeadProps,
  HeadFunction,
  ErrorBoundaryProps,
}

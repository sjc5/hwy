import { Action, Loader, UIProps as _UIProps } from "../../common/index.mjs";

export type UIProps<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = _UIProps<LoaderType, ActionType, (...props: any) => JSX.Element>;

export type UIComponent<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = (props: UIProps<LoaderType, ActionType>) => JSX.Element;

export type RootLayoutProps = {
  children: JSX.Element;
} & Pick<UIProps, "params" | "splatSegments" | "adHocData">;
export type RootLayoutComponent = (props: RootLayoutProps) => JSX.Element;

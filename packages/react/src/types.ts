import type { FunctionComponent, ReactElement } from "react";
import { Action, Loader, UIProps as _UIProps } from "../../common/index.mjs";

export type UIProps<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = _UIProps<LoaderType, ActionType, FunctionComponent>;

export type UIComponent<
  LoaderType extends Loader = Loader,
  ActionType extends Action = Action,
> = (props: UIProps<LoaderType, ActionType>) => ReactElement;

export type RootLayoutProps = { children: ReactElement } & Pick<
  UIProps,
  "params" | "splatSegments" | "adHocData"
>;
export type RootLayoutComponent = FunctionComponent<RootLayoutProps>;

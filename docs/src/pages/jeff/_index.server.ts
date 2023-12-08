import type { DataProps } from "hwy";

export async function action(props: DataProps) {
  return "bob" as const;
}

export type ActionType = typeof action;

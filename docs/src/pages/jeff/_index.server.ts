import type { DataProps } from "hwy";

export async function action(props: DataProps) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return Math.random();
}

export type ActionType = typeof action;

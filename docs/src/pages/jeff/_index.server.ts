import type { DataProps } from "hwy";

const IS_SERVER = typeof document === "undefined";

if (!IS_SERVER) {
  throw new Error("This file should not be imported on the server");
}

export async function action(props: DataProps) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return "bob" as const;
}

export type ActionType = typeof action;

import type { JSX } from "preact";

type ChildrenPermissive = string | JSX.Element | (string | JSX.Element)[];

export type { ChildrenPermissive };

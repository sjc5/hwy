import { type ChildrenPermissive } from "../types.js";

export const Link = (
  props: JSX.IntrinsicElements["a"] & { children: ChildrenPermissive },
) => {
  return (
    <a {...props} class={`link ${props.class}`}>
      {props.children}
    </a>
  );
};

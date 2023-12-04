import { type ChildrenPermissive } from "../types.js";

function Boldtalic({ children }: { children: ChildrenPermissive }) {
  return (
    <b>
      <i>{children}</i>
    </b>
  );
}

export { Boldtalic };

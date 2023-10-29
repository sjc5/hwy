import type { ChildrenPermissive } from "../types.js";

function H3Wrapper({
  heading,
  children,
}: {
  heading: string;
  children: ChildrenPermissive;
}) {
  return (
    <div>
      <h3 class="h3">{heading}</h3>
      {children}
    </div>
  );
}

export { H3Wrapper };

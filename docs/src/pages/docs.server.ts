import { DataProps, type HeadFunction } from "hwy";

export async function loader({ c }: DataProps) {
  return c.redirect("/asdf");
}

export const head: HeadFunction = () => {
  return [
    { title: "Hwy Framework Docs" },
    {
      tag: "meta",
      attributes: {
        name: "description",
        content:
          "Documentation for the Hwy framework, a simple, lightweight, and flexible web framework, built on Hono and HTMX.",
      },
    },
  ];
};

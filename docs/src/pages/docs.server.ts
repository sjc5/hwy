import type { HeadFunction } from "hwy";

export const head: HeadFunction = () => {
  return [
    { title: "Hwy Framework Docs" },
    {
      tag: "meta",
      props: {
        name: "description",
        content:
          "Documentation for the Hwy framework, a simple, lightweight, and flexible web framework, built on Hono and HTMX.",
      },
    },
  ];
};

export async function loader() {
  return { fromLoader: "YO DUDE THIS IS FROM THE LOADER" + Math.random() };
}

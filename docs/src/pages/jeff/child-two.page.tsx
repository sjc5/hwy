import type { PageProps, HeadFunction } from "hwy";
import { TestClientApp } from "../test-client-app.js";

export default function ({ Outlet }: PageProps) {
  return (
    <>
      <a href="/jeff/child-one">Go to child one</a>
      <TestClientApp />
    </>
  );
}

export const head: HeadFunction = () => {
  return [
    { title: "CHILD TWO" },
    {
      tag: "meta",
      props: {
        name: "description",
        content: "CHILD TWO",
      },
    },
  ];
};

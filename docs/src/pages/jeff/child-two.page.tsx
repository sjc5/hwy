import type { HeadFunction } from "hwy";
import { TestClientApp } from "../test-client-app.js";

export default function () {
  return (
    <>
      <a href="/jeff/child-one">Go to child one</a>
      <TestClientApp data={"MOLLY"} />
    </>
  );
}

export const head: HeadFunction = () => {
  return [
    { title: "CHILD TWO" },
    {
      tag: "meta",
      attributes: {
        name: "description",
        content: "CHILD TWO",
      },
    },
  ];
};

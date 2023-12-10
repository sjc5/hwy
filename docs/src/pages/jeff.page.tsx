import type { PageProps } from "hwy";
import { TestClientApp } from "./test-client-app.js";
import { submit } from "@hwy-js/client";

export default function ({ Outlet, actionData }: PageProps<any, any>) {
  return (
    <>
      THis is index page
      <form style={{ background: "black" }} method="POST" action="/jeff">
        THIS IS A FORM
        <input style={{ background: "indigo" }} />
        <button>Submit</button>
      </form>
      <button
        onClick={async () => {
          await submit({ to: "/jeff", data: { name: "jeff" } });
        }}
      >
        POST
      </button>
      <a href="/jeff/child-one">Go to child one</a>
      <TestClientApp data={actionData} />
      <div>{JSON.stringify(actionData)}</div>
      <Outlet />
    </>
  );
}

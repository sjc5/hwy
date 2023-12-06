import type { PageProps } from "hwy";
import { TestClientApp } from "../test-client-app.js";
import { postToAction } from "../../test_initPreactClient.js";
import type { ActionType } from "./_index.server.js";

const IS_SERVER = typeof document === "undefined";

if (IS_SERVER) {
  console.log("Running on server");
} else {
  console.log("Running on client");
}

export default function ({ Outlet, actionData }: PageProps<any, ActionType>) {
  return (
    <>
      THis is index page
      <button
        onClick={async () => {
          await postToAction("/jeff");
        }}
      >
        POST
      </button>
      <div>{JSON.stringify(actionData)}</div>
      <a href="/jeff/child-one">Go to child one</a>
      <TestClientApp />
    </>
  );
}

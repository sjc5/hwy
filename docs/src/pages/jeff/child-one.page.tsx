import type { PageProps } from "hwy";
import { TestClientApp } from "../test-client-app.js";

export default function ({ Outlet }: PageProps) {
  return (
    <>
      <a href="/jeff/child-two">Go to child two</a>
      <TestClientApp />
    </>
  );
}

import type { PageProps } from "hwy";
import { TestClientApp } from "./test-client-app.js";

export default function ({ Outlet }: PageProps) {
  return (
    <>
      Here's some preact:
      <TestClientApp />
      Here's the outlet:
      <Outlet />
    </>
  );
}

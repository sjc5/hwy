import { submit } from "@hwy-js/client";
import { RouteComponentProps } from "@hwy-js/react";
import {
  MutationAPIKey,
  MutationAPIOutput,
  QueryAPIKey,
  QueryAPIOutput,
} from "~/__generated_ts_api/api-types";

// __TODO this whole file is moot

type AppRouteComponentProps<T extends QueryAPIKey | MutationAPIKey> =
  RouteComponentProps<{
    loaderOutput: QueryAPIOutput<T extends QueryAPIKey ? T : any>;
  }>;

const thisRoute = "/login";

export default function (props: any) {
  const colStyles = {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  } as const;
  const labelStyles = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    fontSize: "0.9rem",
  } as const;

  return (
    <div style={colStyles}>
      <h1 style={{ fontSize: "1.5rem" }}>Login</h1>

      {JSON.stringify(props.loaderData)}
      {props.loaderData?.Bob}

      <p>
        <b>NOTE:</b> This is a fake login form. It does not log you into
        anything or send your input data anywhere. Further, it is not
        implemented in a secure way. If you use it as a base, make sure to do
        all the right things, such as password hashing, secure session
        management, etc. This is only intended to show how "route actions" work.
      </p>

      <p>
        This is coming from <code>src/pages/__auth/login.route.tsx</code>. The{" "}
        "__auth" part is a folder that is ignored because it is preceded by two
        underscores (i.e., "__"). This can help you to add arbitrary
        organization to your pages if you'd like.
      </p>

      {!props.actionData?.success && (
        <form
          action={thisRoute}
          method="POST"
          style={colStyles}
          data-boost
          onSubmit={async (e) => {
            e.preventDefault();
            await submit(thisRoute, {
              method: "POST",
              body: new FormData(e.currentTarget),
            });
          }}
        >
          <label style={labelStyles}>
            Email
            <input
              name="email"
              type="email"
              id="email"
              placeholder="you@example.com"
            />
          </label>

          <label style={labelStyles}>
            Password
            <input
              id="password"
              name="password"
              type="password"
              placeholder="P@$5W0&D"
            />
          </label>

          <button className="btn" type="submit">
            Login
          </button>
        </form>
      )}

      {props.actionData?.message && (
        <div
          style={
            props.actionData.error
              ? { color: "lightcoral" }
              : {
                  color: "lightgreen",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                }
          }
        >
          {props.actionData.message}
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  return <div>ERROR2!</div>;
}

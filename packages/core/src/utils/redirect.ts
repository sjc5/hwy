import type { Context } from "hono";

// public
function redirect({
  c,
  to,
  status,
}: {
  c: Context;
  to: string;
  status?: number;
}) {
  if (c.req.headers.get("HX-Request")) {
    if (to.startsWith("http")) {
      c.res.headers.set("HX-Redirect", to);
      return c.res;
    }

    const status_as_string = status?.toString().trim();

    if (
      status_as_string &&
      (!status_as_string.startsWith("3") || status_as_string.length !== 3)
    ) {
      throw new Error("You must use a 3xx status code when redirecting");
    }

    return new Response(null, {
      status: status ?? 302,
      headers: {
        Location: to,
      },
    });
  }

  return c.redirect(to);
}

export { redirect };

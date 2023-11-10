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
  c.status(status ?? 302);

  if (c.req.raw.headers.get("HX-Request") && to.startsWith("http")) {
    c.res.headers.set("HX-Redirect", to);
    return c.body(null);
  }

  return c.redirect(to);
}

export { redirect };

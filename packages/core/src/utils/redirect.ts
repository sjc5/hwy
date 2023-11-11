import type { Context } from "hono";

// public
function redirect({
  c,
  to,
  status,
  useHxLocation,
}: {
  c: Context;
  to: string;
  status?: number;
  useHxLocation?: boolean;
}) {
  c.status(status ?? 302);

  if (!c.req.raw.headers.get("HX-Request")) {
    return c.redirect(to);
  }

  if (to.startsWith("http")) {
    c.header("HX-Redirect", to);
    return c.body(null);
  }

  if (useHxLocation) {
    c.header("HX-Location", to);
    return c.body(null);
  }

  return c.redirect(to);
}

export { redirect };

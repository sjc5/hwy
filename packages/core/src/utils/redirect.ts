import type { Context } from "hono";
import { get_is_hx_request } from "./get-is-hx-request.js";

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

  const is_hx_request = get_is_hx_request(c);

  if (!is_hx_request) {
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

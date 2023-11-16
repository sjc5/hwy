import type { Context } from "hono";

function get_is_hx_request(c: Context) {
  return Boolean(c.req.raw.headers.get("HX-Request"));
}

export { get_is_hx_request };

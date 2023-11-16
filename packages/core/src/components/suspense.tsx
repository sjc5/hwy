import type { Context } from "hono";
import { Suspense as HonoSuspense } from "hono/jsx/streaming";
import { get_is_hx_request } from "../utils/get-is-hx-request.js";

/**
 * @experimental
 * This component is experimental, as is Hono's Suspense support.
 */
function Suspense({
  c,
  children,
  fallback,
}: {
  c: Context;
  children: Parameters<typeof HonoSuspense>[0]["children"];
  fallback: Parameters<typeof HonoSuspense>[0]["fallback"];
}) {
  /*
   * Streaming Suspense doesn't work for HTMX requests,
   * but it works for initial page loads.
   */

  const is_hx_request = get_is_hx_request(c);

  if (is_hx_request) {
    return <>{children}</>;
  }

  return <HonoSuspense fallback={fallback}>{children}</HonoSuspense>;
}

export { Suspense };

import type { Context } from "hono";
import { Suspense } from "hono/jsx/streaming";
import { get_is_hx_request } from "../utils/get-is-hx-request.js";

/**
 * @experimental
 * This component is experimental, as is Hono's Suspense support.
 */
async function HwySuspense({
  c,
  children,
  fallback,
}: {
  c: Context;
  children: Parameters<typeof Suspense>[0]["children"];
  fallback: Parameters<typeof Suspense>[0]["fallback"];
}) {
  /*
   * Streaming Suspense doesn't work for HTMX requests,
   * but it works for initial page loads.
   */

  const is_hx_request = get_is_hx_request(c);

  if (is_hx_request) {
    return <>{children}</>;
  }

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

export { HwySuspense as Suspense };

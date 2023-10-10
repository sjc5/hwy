import type { Context } from "hono";

async function extractSimpleFormData<T extends string>({
  c,
  doNotTrim,
}: {
  c: Context;
  doNotTrim?: boolean;
}): Promise<Record<T, string>> {
  if (
    c.req.method !== "POST" ||
    c.req.raw.headers.get("content-type") !==
      "application/x-www-form-urlencoded"
  ) {
    throw new Error("Invalid request type or content-type");
  }

  const body = await c.req.raw.text();
  const formData = new URLSearchParams(body);
  const dataObject: Partial<Record<T, string>> = {};

  for (const [key, value] of formData.entries()) {
    dataObject[key as T] = doNotTrim ? value : value.trim();
  }

  return dataObject as Record<T, string>;
}

export { extractSimpleFormData };

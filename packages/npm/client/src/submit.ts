import { HWY_PREFIX_JSON } from "../../common/index.mjs";
import {
  abortControllers,
  handleAbortController,
} from "./abort_controllers.js";
import { handleRedirects } from "./handle_redirects.js";
import { getIsErrorRes, getIsGETRequest } from "./helpers.js";
import { revalidate } from "./navigate.js";
import { setStatus } from "./status.js";

export async function submit<T extends any = any>(
  url: string | URL,
  requestInit?: RequestInit,
): Promise<
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    }
> {
  const submitRes = await submitInner(url, requestInit);

  if (!submitRes.success) {
    console.error(submitRes.error);
    return { success: false, error: submitRes.error };
  }

  try {
    const json = await submitRes.response.json();

    const ok = "apiResponseData" in json && Array.isArray(json.actionData);
    if (!ok) {
      console.error("Invalid response from server", json);
      return { success: false, error: "Invalid response from server" };
    }

    if (!submitRes.alreadyRevalidated) {
      await revalidate();
    }

    return {
      success: true,
      data: json.apiResponseData as T,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

async function submitInner(
  url: string | URL,
  requestInit?: RequestInit,
): Promise<
  (
    | {
        success: true;
        response: Response;
      }
    | { success: false; error: string }
  ) & { alreadyRevalidated?: boolean }
> {
  setStatus({ type: "submission", value: true });

  const abortControllerKey = url + (requestInit?.method || "");
  const { abortController, didAbort } =
    handleAbortController(abortControllerKey);

  const urlToUse = new URL(url, window.location.origin);
  urlToUse.searchParams.set(HWY_PREFIX_JSON, "1");

  try {
    const { response, didRedirect } = await handleRedirects({
      abortController,
      url: urlToUse,
      requestInit,
    });

    abortControllers.delete(abortControllerKey);

    if (response && getIsErrorRes(response)) {
      setStatus({ type: "submission", value: false });
      return {
        success: false,
        error: String(response.status),
        alreadyRevalidated: didRedirect || undefined,
      } as const;
    }

    if (didAbort) {
      if (!getIsGETRequest(requestInit)) {
        // resets status bool
        await revalidate();
      }
      return {
        success: false,
        error: "Aborted",
        alreadyRevalidated: true,
      } as const;
    }

    if (!response?.ok) {
      const msg = String(response?.status || "unknown");
      return {
        success: false,
        error: msg,
        alreadyRevalidated: didRedirect || undefined,
      } as const;
    }

    setStatus({ type: "submission", value: false });

    return {
      success: true,
      response,
      alreadyRevalidated: didRedirect || undefined,
    } as const;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // eat
      return {
        success: false,
        error: "Aborted",
      } as const;
    } else {
      console.error(error);
      setStatus({ type: "submission", value: false });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as const;
    }
  }
}

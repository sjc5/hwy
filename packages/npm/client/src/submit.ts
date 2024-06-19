import { HWY_PREFIX_JSON, getHwyClientGlobal } from "../../common/index.mjs";
import {
  abortControllers,
  handleAbortController,
} from "./abort_controllers.js";
import { handleRedirects } from "./handle_redirects.js";
import { getIsErrorRes, getIsGETRequest } from "./helpers.js";
import { revalidate } from "./navigate.js";
import { reRenderApp } from "./render.js";
import { setStatus } from "./status.js";

const hwyClientGlobal = getHwyClientGlobal();

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

  const json = await submitRes.response.json();

  const ok = "actionData" in json && Array.isArray(json.actionData);
  if (!ok) {
    console.error("Invalid response from server", json);
    return { success: false, error: "Invalid response from server" };
  }

  hwyClientGlobal.set("actionData", json.actionData);
  reRenderApp({ json, navigationType: "revalidation" });

  return {
    success: true,
    data: json.actionData[json.actionData.length - 1] as T,
  };
}

async function submitInner(
  url: string | URL,
  requestInit?: RequestInit,
): Promise<
  | {
      success: true;
      response: Response;
    }
  | { success: false; error: string }
> {
  setStatus({ type: "submission", value: true });

  const abortControllerKey = url + (requestInit?.method || "");
  const { abortController, didAbort } =
    handleAbortController(abortControllerKey);

  const urlToUse = new URL(url, window.location.origin);
  urlToUse.searchParams.set(HWY_PREFIX_JSON, "1");

  try {
    const response = await handleRedirects({
      abortController,
      url: urlToUse,
      requestInit,
    });

    abortControllers.delete(abortControllerKey);

    if (response && getIsErrorRes(response)) {
      setStatus({ type: "submission", value: false });
      return { success: false, error: String(response.status) } as const;
    }

    if (didAbort) {
      if (!getIsGETRequest(requestInit)) {
        // resets status bool
        await revalidate();
      }
      return { success: false, error: "Aborted" } as const;
    }

    if (!response?.ok) {
      const msg = String(response?.status || "unknown");
      return { success: false, error: msg } as const;
    }

    setStatus({ type: "submission", value: false });

    return { success: true, response } as const;
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

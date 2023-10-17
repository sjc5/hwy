import { LIVE_REFRESH_SSE_PATH } from "../../../common/index.mjs";
import type { HtmlEscapedString } from "hono/utils/html";
import { get_hwy_global } from "../utils/get-hwy-global.js";

const get_dev_live_refresh_script_inner_html = (timeout_ms = 300) => {
  const statement_1 = `let es=new EventSource('${LIVE_REFRESH_SSE_PATH}');`;
  const statement_2 = `es.addEventListener('message',(ev)=>{if(ev.data=='reload')setTimeout(()=>window.location.reload(),${timeout_ms})});`;
  return statement_1 + statement_2;
};

const hwy_global = get_hwy_global();

function DevLiveRefreshScript(props?: {
  timeoutInMs?: number;
}): HtmlEscapedString {
  if (
    hwy_global.get("is_dev") &&
    hwy_global.get("deployment_target") !== "cloudflare-pages"
    // Wrangler does its own live reload
  ) {
    return (
      <script
        type="module"
        dangerouslySetInnerHTML={{
          __html: get_dev_live_refresh_script_inner_html(props?.timeoutInMs),
        }}
      />
    );
  }

  return <></>;
}

export { DevLiveRefreshScript };

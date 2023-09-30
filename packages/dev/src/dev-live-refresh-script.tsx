import { LIVE_REFRESH_PATH } from "./refresh-middleware.js";
import type { HtmlEscapedString } from "hono/utils/html";

const get_dev_live_refresh_script_inner_html = (timeout_ms = 300) => {
  const statement_1 = `let es=new EventSource('${LIVE_REFRESH_PATH}');`;
  const statement_2 = `es.addEventListener('message',(ev)=>{if(ev.data=='reload')setTimeout(()=>window.location.reload(),${timeout_ms})});`;
  return statement_1 + statement_2;
};

function DevLiveRefreshScript(props?: {
  timeoutInMs?: number;
}): HtmlEscapedString {
  if (process.env.NODE_ENV === "development") {
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

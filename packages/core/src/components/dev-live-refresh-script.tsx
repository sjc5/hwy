import { LIVE_REFRESH_SSE_PATH } from "../../../common/index.mjs";
import { get_hwy_global } from "../utils/get-hwy-global.js";
import { DEV_BUNDLED_CSS_LINK_BASE } from "../utils/hashed-public-url.js";

const hwy_global = get_hwy_global();

function getShouldUseRefresh() {
  return Boolean(
    hwy_global.get("is_dev") &&
      // Wrangler does its own live reload
      hwy_global.get("deployment_target") !== "cloudflare-pages",
  );
}

const getRefreshScript = (timeoutInMs = 300) => {
  if (!getShouldUseRefresh()) {
    return "";
  }

  return `
  new EventSource("${LIVE_REFRESH_SSE_PATH}").addEventListener("message", (e) => {
    const { changeType } = JSON.parse(e.data);
    function refresh() {
      if (changeType === "css-bundle") {
        for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
          const url = new URL(link.href);
          if (
            url.host === location.host &&
            url.pathname.startsWith("/public/dist/standard-bundled.")
          ) {
            const next = link.cloneNode();
            // const buster = Math.random().toString().replace("0.", "");
            next.href = "${DEV_BUNDLED_CSS_LINK_BASE}"; // + buster;
            next.onload = () => link.remove();
            link.parentNode?.insertBefore(next, link.nextSibling);
          }
        }
      } else {
        setTimeout(() => window.location.reload(), ${timeoutInMs});
      }
    }
    refresh();
  });
  `.trim();
};

function DevLiveRefreshScript(props?: { timeoutInMs?: number }) {
  if (getShouldUseRefresh()) {
    return (
      <script
        type="module"
        dangerouslySetInnerHTML={{
          __html: getRefreshScript(props?.timeoutInMs),
        }}
      />
    );
  }

  return <></>;
}

export { DevLiveRefreshScript, getRefreshScript };

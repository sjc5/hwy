import { getHwyGlobal } from "../../../common/index.mjs";
import { GetRouteDataOutput } from "../router/router.js";
import { utils } from "../utils/hwy-utils.js";

const hwyGlobal = getHwyGlobal();

function getCriticalInlinedCssProps() {
  return {
    id: utils.getCriticalCssElementId(),
    dangerouslySetInnerHTML: {
      __html: utils.getCriticalCss(),
    },
  };
}

function getMetaElementsProps(baseProps: GetRouteDataOutput) {
  const arr = [
    { attributes: { "data-hwy": "meta-start" } },
    ...baseProps.metaHeadBlocks,
    { attributes: { "data-hwy": "meta-end" } },
  ] as const;
  return arr.map((block) => {
    return block.attributes;
  });
}

function getServerRenderingProps(baseProps: GetRouteDataOutput) {
  return {
    type: "module",
    dangerouslySetInnerHTML: {
      __html: utils.getSsrInnerHtml(baseProps),
    },
  };
}

function getInjectedScriptsProps() {
  return (hwyGlobal.get("injectedScripts") ?? []).map((script) => {
    return {
      src: utils.getPublicUrl(script),
      defer: true,
    };
  });
}

function getClientEntryModuleProps() {
  return {
    type: "module",
    src: utils.getClientEntryUrl(),
  };
}

function getRestHeadElementsProps(baseProps: GetRouteDataOutput) {
  return [
    { tag: "meta", attributes: { "data-hwy": "rest-start" } },
    ...baseProps.restHeadBlocks,
    { tag: "meta", attributes: { "data-hwy": "rest-end" } },
  ];
}

function getBundledStylesheetProps() {
  return {
    rel: "stylesheet",
    href: utils.getBundledCssUrl(),
  };
}

function getDevRefreshScriptProps(timeoutInMs?: number) {
  const devRefreshScript = utils.getRefreshScript(timeoutInMs);
  return {
    type: "module",
    dangerouslySetInnerHTML: {
      __html: devRefreshScript,
    },
  };
}

export { ClientScripts, CssImports, DevLiveRefreshScript, HeadElements };

/////////////////////////////////////////////////////////////////////
///////////////////// EXISTING HEAD ELEMENTS ///////////////////////
/////////////////////////////////////////////////////////////////////

function HeadElements(baseProps: GetRouteDataOutput) {
  return (
    <>
      <title>{baseProps.title}</title>
      {getMetaElementsProps(baseProps).map((props, i) => (
        <meta {...props} key={i} />
      ))}
      {getRestHeadElementsProps(baseProps).map((props, i) => (
        <props.tag {...props.attributes} key={i} />
      ))}
    </>
  );
}

function CssImports() {
  return (
    <>
      <style {...getCriticalInlinedCssProps()} />
      <link {...getBundledStylesheetProps()} />
    </>
  );
}

function ClientScripts(baseProps: GetRouteDataOutput) {
  return (
    <>
      <script {...getServerRenderingProps(baseProps)} />
      {getInjectedScriptsProps().map((props, i) => (
        <script {...props} key={i} />
      ))}
      <script {...getClientEntryModuleProps()} />
    </>
  );
}

function DevLiveRefreshScript() {
  return <script {...getDevRefreshScriptProps()} />;
}

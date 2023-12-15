import { BaseProps, get_hwy_global } from "../../../common/index.mjs";
import { utils } from "../utils/hwy-utils.js";

const hwy_global = get_hwy_global();

function getCriticalInlinedCssProps() {
  return {
    id: utils.getCriticalCssElementId(),
    dangerouslySetInnerHTML: {
      __html: utils.getCriticalCss(),
    },
  };
}

function getMetaElementsProps(baseProps: BaseProps) {
  const arr = [
    { attributes: { "data-hwy": "meta-start" } },
    ...baseProps.metaHeadBlocks,
    { attributes: { "data-hwy": "meta-end" } },
  ];
  return arr.map((block) => {
    return block.attributes;
  });
}

// Only needed if using client-side Preact
function getServerRenderingProps(props: BaseProps) {
  return {
    type: "module",
    dangerouslySetInnerHTML: {
      __html: utils.getSsrInnerHtml(props.activePathData),
    },
  };
}

function getInjectedScriptsProps() {
  return (hwy_global.get("injected_scripts") ?? []).map((script) => {
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

function getRestHeadElementsProps(baseProps: BaseProps) {
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
  const dev_refresh_script = utils.getRefreshScript(timeoutInMs);
  return {
    type: "module",
    dangerouslySetInnerHTML: {
      __html: dev_refresh_script,
    },
  };
}

function getPageSiblingsProps(baseProps: BaseProps) {
  return utils.getSiblingClientHeadBlocks(baseProps).map((block) => {
    return block.attributes;
  });
}

function getHeadElementProps(baseProps: BaseProps) {
  return {
    criticalInlinedCssProps: getCriticalInlinedCssProps(),
    metaElementsProps: getMetaElementsProps(baseProps),
    serverRenderingProps: getServerRenderingProps(baseProps),
    injectedScriptsProps: getInjectedScriptsProps(),
    clientEntryModuleProps: getClientEntryModuleProps(),
    restHeadElementsProps: getRestHeadElementsProps(baseProps),
    pageSiblingsProps: getPageSiblingsProps(baseProps),
    bundledStylesheetProps: getBundledStylesheetProps(),
    devRefreshScriptProps: getDevRefreshScriptProps(),
  } as const;
}

function HeadElements(baseProps: BaseProps) {
  return (
    <>
      <title>{baseProps.title}</title>

      <style {...getCriticalInlinedCssProps()} />

      {getMetaElementsProps(baseProps).map((props) => (
        <meta {...props} />
      ))}

      <script {...getServerRenderingProps(baseProps)} />

      {getInjectedScriptsProps().map((props) => (
        <script {...props} />
      ))}

      <script {...getClientEntryModuleProps()} />

      {getRestHeadElementsProps(baseProps).map((props) => (
        /* @ts-ignore */
        <props.tag {...props.attributes} />
      ))}

      {getPageSiblingsProps(baseProps).map((props) => (
        <script {...props} />
      ))}

      <link {...getBundledStylesheetProps()} />
      <script {...getDevRefreshScriptProps()} />
    </>
  );
}

export { HeadElements, getHeadElementProps };

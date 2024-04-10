import type { RouteData } from "../../core/src/router.js";

export function HeadElements({ routeData }: { routeData: RouteData }) {
  if (!routeData.data) {
    return null;
  }
  const metaElementsProps = [
    { "data-hwy": "meta-start" },
    ...routeData.data.metaHeadBlocks.map((block) => block.attributes),
    { "data-hwy": "meta-end" },
  ];

  const restHeadElementsProps = [
    { tag: "meta", attributes: { "data-hwy": "rest-start" } },
    ...routeData.data.restHeadBlocks,
    { tag: "meta", attributes: { "data-hwy": "rest-end" } },
  ];

  return (
    <>
      <title>{routeData.data.title}</title>

      {metaElementsProps.map((props, i) => (
        <meta {...props} key={i} />
      ))}

      {restHeadElementsProps.map((props, i) => (
        <props.tag {...props.attributes} key={i} />
      ))}
    </>
  );
}

export function CSSImports({ routeData }: { routeData: RouteData }) {
  if (!routeData.ssrData) {
    return null;
  }
  return (
    <>
      {routeData.ssrData.criticalCSS && (
        <style
          id={routeData.ssrData.criticalCSSElementID}
          dangerouslySetInnerHTML={{ __html: routeData.ssrData.criticalCSS }}
        />
      )}
      {routeData.ssrData.bundledCSSURL && (
        <link rel="stylesheet" href={routeData.ssrData.bundledCSSURL} />
      )}
    </>
  );
}

export function ClientScripts({ routeData }: { routeData: RouteData }) {
  if (!routeData.ssrData) {
    return null;
  }
  return (
    <>
      <script
        type="module"
        dangerouslySetInnerHTML={{ __html: routeData.ssrData.ssrInnerHtml }}
      />
      <script type="module" src={routeData.ssrData.clientEntryURL} />
    </>
  );
}

export function DevLiveRefreshScript({ routeData }: { routeData: RouteData }) {
  if (!routeData.ssrData || !routeData.ssrData.devRefreshScript) {
    return null;
  }
  return (
    <script
      type="module"
      dangerouslySetInnerHTML={{ __html: routeData.ssrData.devRefreshScript }}
    />
  );
}

export function Head({ routeData }: { routeData: RouteData }) {
  return (
    <>
      <HeadElements routeData={routeData} />
      <CSSImports routeData={routeData} />
      <ClientScripts routeData={routeData} />
      <DevLiveRefreshScript routeData={routeData} />
    </>
  );
}

import {
  BaseProps,
  TagHeadBlock,
  get_hwy_global,
  sort_head_blocks,
} from "../../../common/index.mjs";
import { utils } from "../utils/hwy-utils.js";

const hwy_global = get_hwy_global();

// TO-DO Rename "hydrateRouteComponents" to "useClientSidePreact"
// TO-DO Include split up head blocks already

function Title({ title }: { title: string }) {
  return <>{title && <title>{title || "Hwy App"}</title>}</>;
}

function CriticalInlinedCss() {
  const critical_css = utils.getCriticalCss();
  return (
    <>
      {critical_css && (
        <style
          id={utils.getCriticalCssElementId()}
          dangerouslySetInnerHTML={{
            __html: critical_css,
          }}
        />
      )}
    </>
  );
}

function MetaElements({
  metaHeadBlocks,
}: {
  metaHeadBlocks: Array<TagHeadBlock>;
}) {
  return (
    <>
      <meta data-hwy="meta-start" />
      {metaHeadBlocks.map((block) => {
        return (
          // @ts-ignore
          <block.tag
            //
            {...block.attributes}
          />
        );
      })}
      <meta data-hwy="meta-end" />
    </>
  );
}

function RenderState(props: BaseProps) {
  const IS_PREACT_MPA = Boolean(
    hwy_global.get("hwy_config").hydrateRouteComponents,
  );
  return (
    <>
      {IS_PREACT_MPA && (
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: utils.getSsrInnerHtml(props.activePathData),
          }}
        />
      )}
    </>
  );
}

function InjectedNonModuleScripts() {
  return (
    <>
      {Boolean(hwy_global.get("injected_scripts").length) &&
        hwy_global.get("injected_scripts").map((script) => {
          return <script defer src={utils.getPublicUrl(script)} />;
        })}
    </>
  );
}

function ClientEntryModule() {
  return <script type="module" src={utils.getClientEntryUrl()} />;
}

function NonMetaHeadElements({
  restHeadBlocks,
}: {
  restHeadBlocks: Array<TagHeadBlock>;
}) {
  return (
    <>
      <meta data-hwy="rest-start" />
      {restHeadBlocks.map((block) => {
        return (
          // @ts-ignore
          <block.tag
            //
            {...block.attributes}
          />
        );
      })}
      <meta data-hwy="rest-end" />
    </>
  );
}

function BundledStylesheet() {
  return (
    <>
      {utils.getBundledCssUrl() && (
        <link rel="stylesheet" href={utils.getBundledCssUrl()} />
      )}
    </>
  );
}

function DevRefreshScript({ timeoutInMs }: { timeoutInMs?: number }) {
  const dev_refresh_script = utils.getRefreshScript(timeoutInMs);

  return (
    <>
      {dev_refresh_script && (
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: dev_refresh_script,
          }}
        />
      )}
    </>
  );
}

function PageSiblingModules() {
  // TO-DO -- and remove from "readHeadBlocks"
  return <></>;
}

function HeadElements(props: BaseProps) {
  const head_blocks = utils.getHeadBlocks(props);
  const { title, metaHeadBlocks, restHeadBlocks } =
    sort_head_blocks(head_blocks);

  return (
    <>
      {/* Title */}
      <Title title={title} />

      {/* Your inlined critical CSS from styles folder */}
      <CriticalInlinedCss />

      {/* Meta tags exported from head functions */}
      <MetaElements metaHeadBlocks={metaHeadBlocks} />

      {/* This is where we inject your initial server-rendered state */}
      <RenderState {...props} />

      {/* Injected scripts (likely copied from a node_modules dist folder) are injected here, NOT as modules */}
      {/* Mainly just used for HTMX, or for older global scripts you want to add into your app */}
      {/* TO-DO -- actually we should probably make that an option. The list shouldn't be an array of strings, but rather objects */}
      <InjectedNonModuleScripts />

      {/* Client entry is a module */}
      <ClientEntryModule />

      {/* Page siblings get injected here, as modules */}
      {/* Injected AFTER all of your custom head stuff, such as link tags */}
      {/* If you want a non-module, just put your script in public and export a custom head element from the route */}
      <NonMetaHeadElements restHeadBlocks={restHeadBlocks} />

      <PageSiblingModules />

      {/* Your bundled CSS from styles folder */}
      <BundledStylesheet />

      {/* Dev only, but this is a module */}
      {/* Optionally takes a timeout in milliseconds argument */}
      <DevRefreshScript />
    </>
  );
}

export { HeadElements };

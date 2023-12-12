import { utils } from "hwy";
import {
  BaseProps,
  sort_head_blocks,
  get_hwy_global,
} from "../../common/index.mjs";

const hwy_global = get_hwy_global();

function PreactHeadElements(props: BaseProps) {
  const IS_PREACT_MPA = hwy_global.get("mode") === "preact-mpa";

  const head_blocks = utils.getHeadBlocks(props);

  const { title, metaHeadBlocks, restHeadBlocks } =
    sort_head_blocks(head_blocks);

  const timeout = undefined; // TODO -- move timeout to HwyConfig.dev and read here
  const dev_refresh_script = utils.getRefreshScript(timeout);

  const critical_css = utils.getCriticalCss();
  const standard_bundled_css_exists = hwy_global.get(
    "standard_bundled_css_exists",
  );

  return (
    <>
      {title && <title>{title}</title>}

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

      {critical_css && (
        <style
          id={utils.getCriticalCssElementId()}
          dangerouslySetInnerHTML={{
            __html: critical_css,
          }}
        />
      )}
      {standard_bundled_css_exists && (
        <link rel="stylesheet" href={utils.getBundledCssUrl()} />
      )}

      {IS_PREACT_MPA && (
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(utils.getImportMap()),
          }}
        />
      )}

      {IS_PREACT_MPA && (
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: utils.getSsrInnerHtml(props.activePathData),
          }}
        />
      )}

      <script type="module" src={utils.getClientEntryUrl()} />

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

export { PreactHeadElements };

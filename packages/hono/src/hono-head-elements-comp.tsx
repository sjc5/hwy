import { utils } from "../../core/src/utils/hwy-utils.js";
import {
  BaseProps,
  get_hwy_global,
  sort_head_blocks,
} from "../../common/index.mjs";

const hwy_global = get_hwy_global();

function HonoHeadElements(props: BaseProps) {
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

      {metaHeadBlocks.map((block) => {
        return (
          // @ts-ignore
          <block.tag
            //
            {...block.attributes}
          />
        );
      })}

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

      <script type="module" src={utils.getClientEntryUrl()} />

      {restHeadBlocks.map((block) => {
        return (
          // @ts-ignore
          <block.tag
            //
            {...block.attributes}
          />
        );
      })}

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

export { HonoHeadElements };

import { utils } from "../utils/hwy-utils.js";
import { get_hwy_global } from "../utils/get-hwy-global.js";
import { DevLiveRefreshScript } from "./dev-live-refresh-script.js";
import { CssImports } from "./css-imports.js";
import { BaseProps, sort_head_blocks } from "../../../common/index.mjs";

const hwy_global = get_hwy_global();

function HeadElements(props: BaseProps) {
  const IS_PREACT = hwy_global.get("mode") === "preact-mpa";

  const head_blocks = utils.getHeadBlocks(props);

  const { title, metaHeadBlocks, restHeadBlocks } =
    sort_head_blocks(head_blocks);

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

      <CssImports />

      {IS_PREACT && (
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(utils.getImportMap()),
          }}
        />
      )}

      {IS_PREACT && (
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

      <DevLiveRefreshScript />
    </>
  );
}

export { HeadElements };

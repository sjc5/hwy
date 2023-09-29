import path from "node:path";
import type { HtmlEscapedString } from "hono/utils/html";
import { getPublicUrl } from "../utils/hashed-public-url.js";
import { PUBLIC_URL_PREFIX, ROOT_DIRNAME } from "../setup.js";
import { pathToFileURL } from "node:url";

let critical_css: string | undefined;
let standard_bundled_css_exists: boolean | undefined;

async function warm_css_files() {
  console.log({ ROOT_DIRNAME, PUBLIC_URL_PREFIX });

  if (critical_css === undefined) {
    const critical_css_path = path.join(
      ROOT_DIRNAME,
      PUBLIC_URL_PREFIX,
      "critical-bundled-css.js"
    );

    console.log({ critical_css_path });

    critical_css = (await import(pathToFileURL(critical_css_path).href))
      .default;
  }

  if (standard_bundled_css_exists === undefined) {
    const standard_bundled_css_exists_path = path.join(
      ROOT_DIRNAME,
      PUBLIC_URL_PREFIX,
      "standard-bundled-css-exists.js"
    );

    standard_bundled_css_exists = (
      await import(pathToFileURL(standard_bundled_css_exists_path).href)
    ).default;
  }
}

function CriticalCss(): HtmlEscapedString {
  if (!critical_css) return <></>;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: critical_css,
      }}
    ></style>
  );
}

const CSS_IMPORT_URL = `dist/standard-bundled.css`;

function NonCriticalCss(): HtmlEscapedString {
  if (!standard_bundled_css_exists) return <></>;

  return <link rel="stylesheet" href={getPublicUrl(CSS_IMPORT_URL)} />;
}

function CssImports(): HtmlEscapedString {
  return (
    <>
      <CriticalCss />
      <NonCriticalCss />
    </>
  );
}

export {
  // public
  CssImports,

  // private
  CSS_IMPORT_URL,
  warm_css_files,
};

import path from "node:path";
import type { HtmlEscapedString } from "hono/utils/html";
import { getPublicUrl } from "../utils/hashed-public-url.js";
import { ROOT_DIRNAME } from "../setup.js";
import { pathToFileURL } from "node:url";

const critical_css_path = path.join(
  ROOT_DIRNAME,
  "dist",
  "critical-bundled-css.js"
);
const standard_bundled_css_exists_path = path.join(
  ROOT_DIRNAME,
  "dist",
  "standard-bundled-css-exists.js"
);

const promises = await Promise.all([
  import(pathToFileURL(critical_css_path).href),
  import(pathToFileURL(standard_bundled_css_exists_path).href),
]);

const critical_css = promises[0].default;
const standard_bundled_css_exists = promises[1].default;

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
};

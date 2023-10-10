import type { HtmlEscapedString } from "hono/utils/html";
import { getPublicUrl } from "../utils/hashed-public-url.js";

function CriticalCss(): HtmlEscapedString {
  const critical_css: string | undefined = (globalThis as any)
    .__hwy__critical_bundled_css;

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
  const standard_bundled_css_exists: boolean | undefined = (globalThis as any)
    .__hwy__standard_bundled_css_exists;

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

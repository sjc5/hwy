import { getPublicUrl } from "../utils/hashed-public-url.js";
import { get_hwy_global } from "../utils/get-hwy-global.js";

const hwy_global = get_hwy_global();

function CriticalCss() {
  const critical_css = hwy_global.get("critical_bundled_css");

  if (!critical_css) {
    return <></>;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: critical_css,
      }}
    ></style>
  );
}

const CSS_IMPORT_URL = `dist/standard-bundled.css`;

function NonCriticalCss() {
  const standard_bundled_css_exists = hwy_global.get(
    "standard_bundled_css_exists",
  );

  if (!standard_bundled_css_exists) {
    return <></>;
  }

  return <link rel="stylesheet" href={getPublicUrl(CSS_IMPORT_URL)} />;
}

function CssImports() {
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

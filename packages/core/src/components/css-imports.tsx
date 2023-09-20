import path from 'node:path'
import fs from 'node:fs'
import { HtmlEscapedString } from '../types.js'
import { getHashedPublicUrl } from '../utils/hashed-public-url.js'
import { ROOT_DIRNAME } from '../setup.js'

function CriticalCss(): HtmlEscapedString {
  const critical_css_path = path.join(ROOT_DIRNAME, 'critical-bundled.css')
  const critical_css_exists = fs.existsSync(critical_css_path)

  if (!critical_css_exists) return <></>

  const critical_css = fs.readFileSync(critical_css_path, 'utf8').trim()

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: critical_css,
      }}
    ></style>
  )
}

const CSS_IMPORT_URL = `dist/standard-bundled.css`

function NonCriticalCss(): HtmlEscapedString {
  const standard_css_exists = fs.existsSync(
    path.join(ROOT_DIRNAME, 'standard-bundled-css-exists.txt')
  )

  if (!standard_css_exists) return <></>

  return (
    <link rel="stylesheet" href={getHashedPublicUrl({ url: CSS_IMPORT_URL })} />
  )
}

function CssImports(): HtmlEscapedString {
  return (
    <>
      <CriticalCss />
      <NonCriticalCss />
    </>
  )
}

export {
  // public
  CssImports,

  // private
  CSS_IMPORT_URL,
}

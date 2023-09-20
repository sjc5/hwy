import { Options } from './types.js'

function get_client_entry(options: Options) {
  return (
    `
const __window = window as any

import htmx from 'htmx.org'
__window.htmx = htmx
${
  options.with_nprogress
    ? `
import NProgress from 'nprogress'
__window.NProgress = NProgress
`
    : ``
}
${options.lang_preference === 'typescript' ? `// @ts-ignore` : ``}
import('htmx.org/dist/ext/head-support.js')
`.trim() + '\n'
  )
}

export { get_client_entry }

import { Options } from './types.js'

const ts_import = `import type { Config } from 'tailwindcss'\n\n`

let tailwind_config = `export default {
  darkMode: 'media',
  content: ['./src/**/*.{__REPLACE_ME__}'],
  theme: {
    extend: {},
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
}`

function get_tailwind_config(options: Options) {
  if (options.lang_preference === 'typescript') {
    tailwind_config =
      ts_import +
      tailwind_config.replace('__REPLACE_ME__', 'ts,tsx') +
      ' satisfies Config\n'
  } else {
    tailwind_config = tailwind_config.replace('__REPLACE_ME__', 'js,jsx')
  }

  return tailwind_config
}

export { get_tailwind_config }

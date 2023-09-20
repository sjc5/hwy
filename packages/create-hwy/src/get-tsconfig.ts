import { Options } from './types.js'

const ts_config = `
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitAny": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  },
  "exclude": ["node_modules", "dist"]
}`

const js_config = `
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}`

function get_ts_config(options: Options) {
  if (options.lang_preference === 'javascript') {
    return js_config.trim()
  }

  return ts_config.trim()
}

export { get_ts_config }

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

function get_ts_config() {
  return ts_config.trim()
}

export { get_ts_config }

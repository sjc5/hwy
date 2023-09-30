import { Options } from "./types.js";
import { target_is_deno } from "./utils.js";

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
}`;

const js_config = `
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}`;

const deno_config = `
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "npm:hono/jsx"
  }
}`;

function get_ts_config(options: Options) {
  if (options.lang_preference === "javascript") {
    return js_config.trim() + "\n";
  }

  if (target_is_deno(options)) {
    return deno_config.trim() + "\n";
  }

  return ts_config.trim() + "\n";
}

export { get_ts_config };

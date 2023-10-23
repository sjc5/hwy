---
"create-hwy": patch
"@hwy-js/build": patch
"hwy": patch
"@hwy-js/dev": patch
---

1. Update all dependencies.

2. Temporarily use Preact's `JSX.IntrinsicElements` types until Hono is updated to include its own `JSX.IntrinsicElements` types for standard HTML elements. This is done through `@hwy-js/dev` and requires Hwy projects to have `@hwy-js/dev` in the types array of their `tsconfig.json` files in order to use these intrisic element types.

3. Update `create-hwy` to use the new `@hwy-js/dev` types in generated project's `tsconfig.json`.

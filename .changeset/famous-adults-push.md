---
"create-hwy": patch
"@hwy-js/build": patch
"hwy": patch
"@hwy-js/dev": patch
---

1. Update all dependencies.

2. Add `JSX.IntrinsicElements` types for better type safety when drafting JSX using standard HTML elements and attributes. This is done through `@hwy-js/dev` and requires Hwy projects to have `@hwy-js/dev` in the types array of their `tsconfig.json` files in order to use these intrisic element types.

3. Update `create-hwy` to use the new `@hwy-js/dev` types in the `tsconfig.json` of generated projects.

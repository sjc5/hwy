# @hwy-js/build

## 0.4.2-beta.4

### Patch Changes

- Add style types

## 0.4.2-beta.3

### Patch Changes

- Update types

## 0.4.2-beta.2

### Patch Changes

- Update JSX types

## 0.4.2-beta.1

### Patch Changes

- Using typescript built-ins instead of Preact types, and added some type munging and fixes to match Hwy's use cases

## 0.4.2-beta.0

### Patch Changes

- 1. Update all dependencies.
  2. Temporarily use Preact's `JSX.IntrinsicElements` types until Hono is updated to include its own `JSX.IntrinsicElements` types for standard HTML elements. This is done through `@hwy-js/dev` and requires Hwy projects to have `@hwy-js/dev` in the types array of their `tsconfig.json` files in order to use these intrisic element types.
  3. Update `create-hwy` to use the new `@hwy-js/dev` types in generated project's `tsconfig.json`.

## 0.4.1

## 0.4.0

### Minor Changes

- 8b7a3d8: First off, huge shoutout to @jharrell for his debugging and research assistance on this PR related to adding Cloudflare Pages support! Thank you!

  - Cloudflare Pages is now supported! Closes #6.
  - Added changesets. Closes #14.
  - Adds a `hwy.config.ts` / `hwy.config.js` file to the root of your project for setting up dev settings and deployment target, and probably other things in the future. As annoying as config files are, this simplifies a lot of things and is not too much to ask for a framework.
  - Removes a lot of complexity / variance in build commands and deploy target hacks, as now we can just read the deployment target from the Hwy config and handle everything in Hwy's centralized build step.
  - Adds a new `@hwy-js/build` package, splitting up the live refresh stuff (stays in `@hwy-js/dev`) from the build stuff.
  - In your `src/main.tsx` file:

    - `{hwyDev?.DevLiveRefreshScript()}` is now just `<DevLiveRefreshScript />`
    - `<ClientEntryScript />` is now `<ClientScripts activePathData={activePathData} />`. This is to enable the new client scripts functionality mentioned below.

  - Added an option to ship client-side JS (including from TS files if you want) by adding a sibling `page-name.client.ts` or `page-name.client.js` file to your page. This becomes basically global JS for that page, and anything imported will be bundled into that page's script, which is built into the public folder and referenced in the document head when you visit that page. This will be better documented later. Closes #15.

### Patch Changes

- 8b7a3d8: rmv rmSync instance, not really necessary
- 8b7a3d8: init changesets
- 8b7a3d8: tweak build step, auto read latest version in create-hwy

## 0.4.0-beta.38

## 0.4.0-beta.37

### Patch Changes

- rmv rmSync instance, not really necessary

## 0.4.0-beta.36

## 0.4.0-beta.35

### Patch Changes

- tweak build step, auto read latest version in create-hwy

## 0.4.0-beta.34

### Patch Changes

- init changesets

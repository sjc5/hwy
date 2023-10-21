---
"create-hwy": minor
"@hwy-js/build": minor
"hwy": minor
"@hwy-js/dev": minor
---

- Cloudflare Pages is now supported!
- Adds a `hwy.config.ts` / `hwy.config.js` file to the root of your project for setting up dev settings and deployment target, and probably other things in the future. As annoying as config files are, this simplifies a lot of things and is not too much to ask for a framework.
- Removes a lot of complexity / variance in build commands and deploy target hacks, as now we can just read the deployment target from the Hwy config and handle everything in Hwy's centralized build step.
- Adds a new `@hwy-js/build` package, splitting up the live refresh stuff (stays in `@hwy-js/dev`) from the build stuff.
- `{hwyDev?.DevLiveRefreshScript()}` is now `<DevLiveRefreshScript />`
- `<ClientEntryScript />` is now `<ClientScripts activePathData={activePathData} />`
- Added an option to ship client-side JS (including from TS files if you want) by adding a sibling `page-name.client.ts` or `page-name.client.js` file to your page. This becomes basically global JS for that page, and anything imported will be bundled into that page's script, which is built into the public folder and referenced in the document head when you visit that page. This will be better documented later.

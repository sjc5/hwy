import { Options } from './types.js'
import { target_is_deno } from './utils.js'

let readme =
  `
# Hwy

Welcome to your new Hwy project!

Be sure to check out the docs at [https://hwy.dev](https://hwy.dev).`.trim() +
  '\n\n'

const vercel_add_on =
  '## IMPORTANT VERCEL-SPECIFIC NOTES:' +
  '\n\n' +
  '### Environment Variables' +
  '\n\n' +
  'In your Vercel dashboard, make sure to set the following environment variable:' +
  '\n\n' +
  '```\nNODEJS_HELPERS=0\n```' +
  '\n\n' +
  '### API Directory Hack' +
  '\n\n' +
  "The Vercel build will fail if it doesn't find a placeholder file at `/api/main.js` in\nyour project root. Make sure to commit this file (included in this template), but know\nthat it will be overwritten during the build process." +
  '\n\n' +
  '### Monorepo Support' +
  '\n\n' +
  'If you are using a monorepo and deploying to Vercel, you will have to pass an\nextra `publicUrlPrefix` option to `hwyInit`, as shown below:' +
  '\n\n' +
  `
\`\`\`ts
hwyInit({
app,
importMetaUrl: import.meta.url,
serveStatic,
/*
* The publicUrlPrefix makes the monorepo work with the public
* folder when deployed with Vercel. If you aren't using a
* monorepo (or aren't deploying to Vercel), you won't need
* to add a publicUrlPrefix.
*/
publicUrlPrefix: process.env.NODE_ENV === 'production' ? 'docs/' : undefined,
watchExclusions: ['src/styles/tw-output.bundle.css'],
})
\`\`\`
`.trim() +
  '\n\n' +
  'In the example above, the code for the Hwy project being deployed lives inside a "docs"\ndirectory in the monorepo root (i.e., at `~/docs/*`). It is only necessary to set a\n`publicUrlPrefix` when deploying to Vercel, and only if you are using a monorepo, and\nonly in production.'

const deno_add_on = `
## IMPORTANT DENO-SPECIFIC NOTES:

Here is our recommended way to use Deno with Hwy:

1. Use \`npm install\` (adjusted for your package manager) to install dependencies.
2. Run \`deno task dev\` to start the dev server.
3. Use the \`npm:\` prefix when importing modules (whether in a source file or in an import map).
This template does import mapping via the "imports" property in \`deno.json\`. This is what
makes the usage of bare specifiers in the source files work.
`.trim()

const deno_tailwind_add_on = `
To use Tailwind with Deno locally, you will need to either run \`npm i -g tailwindcss\` or
set up the [Standalone Tailwind CLI](https://tailwindcss.com/blog/standalone-cli).
`.trim()

const deno_deploy_add_on = `
To deploy on Deno Deploy, you should follow the setup instructions within Deno Deploy
to get a GitHub Actions build step set up. You can use the standard
\`.github/workflows/deploy.yml\` file that is created for you during that setup. 
All you will need to do is update the entrypoint (near the bottom of the yaml file)
to point to \`dist/main.js\`.
`.trim()

function get_readme(options: Options) {
  if (options.deployment_target === 'vercel') {
    readme != vercel_add_on
  }

  const is_targeting_deno = target_is_deno(options)

  if (is_targeting_deno) {
    readme += deno_add_on
  }

  if (is_targeting_deno && options.css_preference === 'tailwind') {
    readme += '\n\n' + deno_tailwind_add_on
  }

  if (options.deployment_target === 'deno_deploy') {
    readme += '\n\n' + deno_deploy_add_on
  }

  return readme.trim() + '\n'
}

export { get_readme }

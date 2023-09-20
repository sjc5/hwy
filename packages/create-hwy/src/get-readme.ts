import { Options } from './types.js'

const readme = `
# Hwy

Welcome to your new Hwy project!

Be sure to check out the docs at [https://hwy.dev](https://hwy.dev).`

function get_readme(options: Options) {
  return (
    readme.trim() +
    (options.deployment_target === 'vercel'
      ? '\n\n' +
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
        'In the example above, the code for the Hwy project being deployed lives inside a "docs"\ndirectory in the monorepo root (i.e., at `~/docs/*`). It is only necessary to set a\n`publicUrlPrefix` when deploying to Vercel, and only if you are using a monorepo, and\nonly in production.' +
        '\n'
      : '\n')
  )
}

export { get_readme }

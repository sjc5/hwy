import { Options } from './types.js'

function get_package_json(options: Options) {
  /* TAILWIND PREBUILD */
  let tailwind_prebuild = {}
  if (options.css_preference === 'tailwind') {
    tailwind_prebuild = {
      'hwy-prebuild':
        'tailwindcss -i src/styles/tw-input.css -o src/styles/tw-output.bundle.css',
    }
  }

  return JSON.stringify(
    {
      name: options.project_name,
      private: true,
      type: 'module',
      scripts: {
        ...tailwind_prebuild,
        [options.deployment_target === 'vercel' ? 'vercel-build' : 'build']:
          (options.lang_preference === 'typescript' ? 'tsc --noEmit && ' : '') +
          'hwy-build' +
          (options.deployment_target === 'vercel'
            ? ' && cp -r dist/* api'
            : ''),
        start: 'node dist/main.js',
        dev: 'hwy-dev-serve',
      },
      dependencies: {
        '@hono/node-server': '^1.1.1',
        hono: '^3.5.8',
        hwy: '^0.1.0',
      },
      devDependencies: {
        '@hwy-js/dev': '^0.1.0',
        ...(options.lang_preference === 'typescript'
          ? { '@types/node': '^20.5.9', '@types/nprogress': '^0.2.0' }
          : {}),
        'cross-env': '^7.0.3',
        esbuild: '^0.19.2',
        'htmx.org': '^1.9.5',
        nodemon: '^3.0.1',
        ...(options.with_nprogress ? { nprogress: '^0.2.0' } : {}),
        ...(options.css_preference === 'tailwind'
          ? { tailwindcss: '^3.3.3' }
          : {}),
        ...(options.lang_preference === 'typescript'
          ? { typescript: '^5.2.2' }
          : {}),
      },
      engines: {
        node: '>=18.14.1',
      },
    },
    null,
    2
  )
}

export { get_package_json }

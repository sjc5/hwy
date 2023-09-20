import path from 'node:path'
import fs from 'node:fs'
import esbuild from 'esbuild'
import { hwy_log } from './hwy-log.js'
import { get_hashed_public_url_low_level } from './hashed-public-url.js'

const URL_REGEX = /url\(\s*['"]([^'"]*)['"]\s*\)/g

function replacer(_: string, p1: string) {
  const hashed = get_hashed_public_url_low_level({
    url: p1,
    ROOT_DIRNAME: path.resolve('dist'),
  })

  return `url("${hashed}")`
}

async function bundle_css_files() {
  const using_styles_dir = fs.existsSync(path.resolve('./src/styles'))
  if (!using_styles_dir) {
    hwy_log('Not using styles directory, skipping css bundling...')
    return
  }
  const directory_path = path.resolve('src/styles')
  const files = await fs.promises.readdir(directory_path)

  const standard_css_paths = files
    .filter((file) => file.endsWith('.bundle.css'))
    .map((file) => path.join(directory_path, file))
    .sort()

  const critical_css_paths = files
    .filter((file) => file.endsWith('.critical.css'))
    .map((file) => path.join(directory_path, file))
    .sort()

  async function build_standard_css() {
    const promises = await Promise.all(
      standard_css_paths.map((x) => fs.promises.readFile(x, 'utf-8'))
    )

    const standard_css_text = promises.join('\n').replace(URL_REGEX, replacer)

    if (standard_css_paths.length) {
      await esbuild.build({
        stdin: {
          contents: standard_css_text,
          resolveDir: path.resolve('src/styles'),
          loader: 'css',
        },
        outfile: path.resolve('public/dist/standard-bundled.css'),
        minify: true,
      })

      fs.writeFileSync(
        path.join(process.cwd(), 'dist/standard-bundled-css-exists.txt'),
        'true'
      )
    }
  }

  async function build_critical_css() {
    const promises = await Promise.all(
      critical_css_paths.map((x) => fs.promises.readFile(x, 'utf-8'))
    )

    const critical_css_text = promises.join('\n').replace(URL_REGEX, replacer)

    if (critical_css_paths.length) {
      await esbuild.build({
        stdin: {
          contents: critical_css_text,
          resolveDir: path.resolve('src/styles'),
          loader: 'css',
        },
        outfile: path.resolve('dist/critical-bundled.css'),
        minify: true,
      })
    }
  }

  await Promise.all([build_standard_css(), build_critical_css()])
}

export { bundle_css_files }

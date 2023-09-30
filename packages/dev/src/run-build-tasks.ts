import path from 'node:path'
import fs from 'node:fs'
import { bundle_css_files } from './bundle-css-files.js'
import { generate_public_file_map, write_paths_to_file } from './walk-pages.js'
import { rimraf } from 'rimraf'
import esbuild from 'esbuild'
import { IS_DEV } from './constants.js'
import { hwy_log, log_perf } from './hwy-log.js'
import { exec as exec_callback } from 'child_process'
import { promisify } from 'node:util'

const exec = promisify(exec_callback)

async function handle_prebuild() {
  try {
    const pkg_json = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
    )
    const prebuild_script = pkg_json.scripts?.['hwy-prebuild']
    const prebuild_dev_script = pkg_json.scripts?.['hwy-prebuild-dev']

    if (!prebuild_script && !prebuild_dev_script) return

    const should_use_dev_script = IS_DEV && prebuild_dev_script

    const script_to_run = should_use_dev_script
      ? prebuild_dev_script
      : prebuild_script

    if (!script_to_run) return

    hwy_log(`Running ${script_to_run}`)

    const { stdout, stderr } = await exec(script_to_run)
    console.log(stdout)
    if (stderr) console.error(stderr)
  } catch (error) {
    console.error('Error running pre-build tasks:', error)
  }
}

async function runBuildTasks(log?: string) {
  hwy_log(`New build initiated${log ? ` (${log})` : ''}`)

  hwy_log(`Running pre-build tasks...`)

  const prebuild_p0 = performance.now()
  await handle_prebuild()
  const prebuild_p1 = performance.now()
  log_perf('pre-build tasks', prebuild_p0, prebuild_p1)

  hwy_log(`Running standard build tasks...`)

  const standard_tasks_p0 = performance.now()

  await rimraf(path.resolve('dist'))
  await fs.promises.mkdir(path.join(process.cwd(), 'dist'), {
    recursive: true,
  })

  // needs to happen once first pre-css bundling
  await generate_public_file_map()

  const is_using_client_entry =
    fs.existsSync(path.join(process.cwd(), 'src/client.entry.ts')) ||
    fs.existsSync(path.join(process.cwd(), 'src/client.entry.js'))

  // needs to come first for file map generation
  await Promise.all([
    bundle_css_files(),

    is_using_client_entry
      ? esbuild.build({
          entryPoints: ['src/client.entry.*'],
          bundle: true,
          outdir: 'public/dist',
          treeShaking: true,
          platform: 'browser',
          format: 'esm',
          minify: true,
        })
      : undefined,
  ])

  await Promise.all([
    write_paths_to_file(),

    // happens again post css bundling
    generate_public_file_map(),

    esbuild.build({
      entryPoints: ['src/main.*'],
      bundle: true,
      outdir: 'dist',
      treeShaking: true,
      platform: 'node',
      packages: 'external',
      format: 'esm',
    }),

    IS_DEV
      ? fs.promises.mkdir(path.join(process.cwd(), '.dev'), {
          recursive: true,
        })
      : undefined,
  ])

  if (IS_DEV) {
    fs.writeFileSync(
      path.join(process.cwd(), '.dev/refresh.txt'),
      Date.now().toString(),
    )
  }

  const standard_tasks_p1 = performance.now()

  log_perf('standard build tasks', standard_tasks_p0, standard_tasks_p1)
}

export { runBuildTasks }

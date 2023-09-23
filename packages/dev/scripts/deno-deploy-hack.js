import fs from 'node:fs'

function get_line(path_from_dist) {
  return `await import("${path_from_dist}"); `
}

function get_code(paths) {
  const pre = 'if (0 > 1) { try { '
  const post = '} catch {} }'
  return pre + paths.map(get_line).join('') + post
}

console.log('Running Deno Deploy hack...')

const page_paths = (await import('./dist/paths.js')).default.map(
  (x) => './' + x.importPath
)

const public_paths = Object.keys(
  JSON.parse(fs.readFileSync('./dist/public-map.json', 'utf8'))
).map((x) => '../' + x)

const other_paths = [
  './standard-bundled-css-exists.txt',
  './critical-bundled.css',
  './paths.js',
  './public-map.json',
  './public-reverse-map.json',
]

fs.writeFileSync(
  './dist/main.js',
  fs.readFileSync('./dist/main.js', 'utf8') +
    '\n' +
    get_code([...page_paths, ...public_paths, ...other_paths])
)

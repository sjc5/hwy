import fs from 'node:fs'
import path from 'node:path'
import { ROOT_DIRNAME } from '../setup.js'

let reverse_public_map: Record<string, string> | undefined

let public_map: Record<string, string> | undefined

function get_public_map({ ROOT_DIRNAME }: { ROOT_DIRNAME: string }) {
  if (!public_map) {
    public_map = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIRNAME, 'public-map.json'), 'utf-8')
    ) as any
  }
  return public_map
}

function get_hashed_public_url_low_level({
  url,
  ROOT_DIRNAME,
}: {
  url: string
  ROOT_DIRNAME: string
}): string {
  /*
   * NOTE: THIS FN IS DUPED IN "hwy" AND "@hwy-js/dev"
   * IF YOU UPDATE IT, UPDATE IT IN BOTH PLACES.
   * STILL NOT WORTH SPLITTING INTO A SEPARATE PKG.
   */

  let hashed_url: string | undefined

  if (url.startsWith('/')) url = url.slice(1)
  if (url.startsWith('./')) url = url.slice(2)

  hashed_url = get_public_map({ ROOT_DIRNAME })?.[path.join('public', url)]

  if (!hashed_url) {
    throw new Error(`No hashed URL found for ${url}`)
  }

  return '/' + hashed_url
}

function getPublicUrl(url: string): string {
  return get_hashed_public_url_low_level({ ROOT_DIRNAME, url })
}

type Props = {
  root_dirname: string
  hashed_url: string
  public_url_prefix?: string
}

function get_original_public_url({
  root_dirname,
  hashed_url,
  public_url_prefix,
}: Props): string {
  if (!reverse_public_map) {
    reverse_public_map = JSON.parse(
      fs.readFileSync(
        path.join(root_dirname, 'public-reverse-map.json'),
        'utf-8'
      )
    ) as any
  }

  const sliced_url = path.normalize(hashed_url.slice(1))
  const original_url = reverse_public_map?.[sliced_url]

  if (!original_url) {
    throw new Error(`No original URL found for ${sliced_url}`)
  }

  return './' + (public_url_prefix ?? '') + original_url
}

function get_serve_static_options({
  root_dirname,
  public_url_prefix,
}: {
  root_dirname: string
  public_url_prefix?: string
}) {
  return {
    rewriteRequestPath: (path: string) => {
      return get_original_public_url({
        root_dirname,
        hashed_url: path,
        public_url_prefix,
      })
    },
  }
}

export {
  getPublicUrl,
  get_serve_static_options,
  get_public_map,
  get_hashed_public_url_low_level,
}

import fs from 'node:fs'
import path from 'node:path'

let public_map: Record<string, string> | undefined

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

  if (!public_map) {
    public_map = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIRNAME, 'public-map.json'), 'utf-8')
    ) as any
  }
  hashed_url = public_map?.['public/' + url]

  if (!hashed_url) {
    throw new Error(`No hashed URL found for ${url}`)
  }

  return '/' + hashed_url
}

export { get_hashed_public_url_low_level }

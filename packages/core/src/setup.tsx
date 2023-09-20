import type { Hono, Context, Next } from 'hono'
import type { serveStatic as serveStaticFn } from '@hono/node-server/serve-static'
import {
  get_hashed_public_url_low_level,
  get_serve_static_options,
} from './utils/hashed-public-url.js'
import { hwyDev } from './utils/conditional-dev.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function dirname_from_import_meta(import_meta_url: string) {
  return path.dirname(fileURLToPath(import_meta_url))
}

// although instantiated with let, this should only ever be set once inside hwyInit
let ROOT_DIRNAME = ''

type ServeStaticFn = typeof serveStaticFn

const IMMUTABLE_CACHE_HEADER_VALUE = 'public, max-age=31536000, immutable'

function immutable_cache() {
  return function (c: Context, next: Next) {
    c.header('Cache-Control', IMMUTABLE_CACHE_HEADER_VALUE)

    if (process.env.VERCEL) {
      c.header('CDN-Cache-Control', IMMUTABLE_CACHE_HEADER_VALUE)
    }

    return next()
  }
}

async function hwyInit({
  app,
  importMetaUrl,
  serveStatic,
  publicUrlPrefix,
  watchExclusions,
}: {
  app: Hono<any>
  importMetaUrl: string
  serveStatic: ServeStaticFn
  publicUrlPrefix?: string
  watchExclusions?: string[]
}) {
  console.log('\nInitializing Hwy app...')

  hwyDev?.devInit({ app, watchExclusions })
  const root_dirname = dirname_from_import_meta(importMetaUrl)
  ROOT_DIRNAME = root_dirname

  app.use('/favicon.ico', async (c) => {
    try {
      return c.redirect(
        get_hashed_public_url_low_level({ ROOT_DIRNAME, url: 'favicon.ico' })
      )
    } catch {
      return c.notFound()
    }
  })

  const static_path = '/public/*'
  app.use(static_path, immutable_cache())
  app.use(
    static_path,
    serveStatic(
      get_serve_static_options({
        root_dirname,
        public_url_prefix: publicUrlPrefix,
      })
    )
  )
}

export {
  // public
  hwyInit,

  // private
  ROOT_DIRNAME,
}

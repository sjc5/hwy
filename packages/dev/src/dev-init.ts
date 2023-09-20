import { IS_DEV } from './constants.js'
import { LIVE_REFRESH_PATH, refreshMiddleware } from './refresh-middleware.js'
import { devSetup } from './setup.js'
import type { Hono } from 'hono'

function devInit({
  app,
  watchExclusions,
}: {
  app: Hono<any>
  watchExclusions?: string[]
}) {
  if (IS_DEV) {
    devSetup({ watchExclusions })
    app.use(LIVE_REFRESH_PATH, refreshMiddleware())
  }
}

export { devInit }

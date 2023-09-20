import {
  hwyInit,
  CssImports,
  getMatchingPathData,
  rootOutlet,
  hwyDev,
  ClientEntryScript,
  HeadElements,
  HeadBlock,
} from 'hwy'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Sidebar } from './components/sidebar.js'

const app = new Hono()

console.log('\nStarting app...')

hwyInit({
  app,
  importMetaUrl: import.meta.url,
  serveStatic,
})

const default_head_blocks: HeadBlock[] = [
  { title: 'Tester' },
  {
    tag: 'meta',
    props: {
      name: 'htmx-config',
      content: JSON.stringify({
        defaultSwapStyle: 'outerHTML',
        selfRequestsOnly: true,
        refreshOnHistoryMiss: true,
      }),
    },
  },
]

app.all('*', async (c, next) => {
  const activePathData = await getMatchingPathData({ c })

  if (activePathData.fetchResponse) return activePathData.fetchResponse

  if (!activePathData.matchingPaths?.length) return await next()

  return c.html(
    `<!DOCTYPE html>` +
    (
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />

          <HeadElements
            activePathData={activePathData}
            c={c}
            defaults={default_head_blocks}
          />

          <CssImports />
          <ClientEntryScript />

          {hwyDev?.DevLiveRefreshScript()}
        </head>

        <body hx-boost="true" hx-target="this">
          <Sidebar />
          <main>
            {await rootOutlet({
              activePathData,
              c,
            })}
          </main>
        </body>
      </html>
    )
  )
})

app.notFound((c) => {
  return c.text('404 Not Found', 404)
})

const IS_DEV = process.env.NODE_ENV === 'development'
const PORT = 9999

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(
    `\nListening on http://${IS_DEV ? 'localhost' : info.address}:${
      info.port
    }\n`
  )
})

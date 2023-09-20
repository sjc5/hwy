import type * as _hwyDev from '@hwy-js/dev'

let hwyDev: typeof _hwyDev | undefined

if (process.env.NODE_ENV === 'development') {
  hwyDev = await import('@hwy-js/dev')
}

export { hwyDev }

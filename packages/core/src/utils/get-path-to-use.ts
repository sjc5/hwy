import type { Context } from 'hono'

function get_path_to_use(c: Context, redirect_to?: string) {
  if (redirect_to) {
    c.header('HX-Push', redirect_to)
    return redirect_to
  }
  const current_url_path = c.req.headers.get('HX-Current-URL')
  const is_boosted = c.req.headers.get('HX-Boosted')
  const path_url = current_url_path ? new URL(current_url_path).pathname : ''
  let path_to_use = is_boosted || !current_url_path ? c.req.path : path_url
  if (path_to_use !== '/' && path_to_use.endsWith('/')) {
    path_to_use = path_to_use.slice(0, -1)
  }
  return path_to_use
}

export { get_path_to_use }

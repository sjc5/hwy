# Notes

## Static File Hashing Optimization

One optimization we could do would be to serve static files not based on their
entire path, but instead based only on their hash. So the public map would be
`{ originalPath: hash }`, and then you'd just save the actual <hash>.<ext> files
directly in `public/dist`. This would make the reverse public map irrelevant,
because the client would something like `src="2348*$djs.js` (the return value
from `getPublicUrl`), and it would simply read that directly from `public/dist`.
The logic of `getPublicUrl` would simply be find the mapping from originalPath
to hash in the public map.

One issue here is that Vercel statically analyzes your `public` folder before
even doing your build, which is a problem if we want to support Vercel. There
are a bunch of other peculiarities with Vercel, so we could kill Vercel support
and simplify a lot. This one is no emergency and is purely "under the hood", so
no need to decide now.

## Move to Preact JSX (away from Hono JSX)

Moving to Preact JSX for SSR allows us to have FOUR modes, easily
interchangeable via config / slightly modified client entry file:

1. Pure MPA (Classic Server-Rendered App)
2. HTMX MPA (Server-Rendered App, upgraded with HTMX / Idiomorph)
3. Hydrated Preact MPA (Server-Rendered App, hydrated with Preact)
4. Server-rendered Preact SPA (where you don't use pages dir and are responsible
   for your own client routing, but it's still SSRd)

The cool thing is that all of these actually work right now, they just need to
be set up.

Here's the table:

| Mode       | Routing Solution | SSR      | Separate server/page files? |
| ---------- | ---------------- | -------- | --------------------------- |
| MPA        | Hwy Pages Folder | Yes      | Optional                    |
| HTMX-MPA   | Hwy Pages Folder | Yes      | Optional                    |
| PREACT-MPA | Hwy Pages Folder | Optional | Yes                         |
| PREACT-SPA | BYOR             | Optional | Not applicable              |

The way you turn SSR "on and off" in modes 3 and 4 is simply by (1) returning
your app from your main server file inside your body tag vs. returning an empty
body tag and (2) using "hydrate" vs. "render" in your client entry file.

This fits with our long-term goal of building of both (1) building a framework
that lets you build ANY kind of app, and (2) building on top of things that are
extremely stable and mature, so we can get to a point of extreme stability and
maturity ourselves. Using Preact JSX serves both of those goals. In that sense,
our core technologies are Hono, Preact JSX, and esbuild. Optional layered
technologies include HTMX, Idiomorph, and Preact Hooks.

### Why not Solid?

- Preact has React compat mode
- Preact is more mature
- Preact is not nearly as finicky with esbuild (Solid needs a custom plugin)

### Why not React?

- Preact is lighter and faster
- Preact has first-party signals support
- Preact more philosophically aligned with Hwy
- Preact has React compat mode anyway

Regarding the "more flexible" argument, the list is long, but primarily here I
mean you can use it in both React compat and non-compat ways, and you have
first-party signals support(in a lot of ways, Hwy is a lot like Fresh, and Fresh
shares a core maintainer with Preact).

## Preact TO-DO

- [ ] Update `create-hwy`
- [ ] Could maybe build Remix-Easy-Mode / DS-1 type solution in?

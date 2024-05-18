---
title: Manifesto
---

**DISCLAIMER:** _This is a bit out of date! Will update soon._

## Hwy is just a protocol

Pragmatically speaking, you can think of Hwy as being a lot like NextJS or
Remix. But at its core, Hwy is just a protocol for passing nested route data
between any server and any client. Conceptually, this matters because being
"just a protocol" means that Hwy isn't technically dependent on any specific
server or client library (or even any specific language). This, in turn, matters
because it reduces your reliance on any one vendor, framework, or even language.

## Agnostic client core, agnostic server core

Hwy's core client-side npm package (`@hwy-js/client`) has no dependencies other
than the low-level `history` npm package (which is maintained by the React
Router team, but is not specific to React). The `@hwy-js/client` package handles
all the client-side routing, nested route data fetching, scroll restoration, and
ultimately dispatching of events to tell whatever rendering library you're using
(_e.g._, React) to re-render the page at the appropriate level of granularity.
As the previous sentence hints, the `@hwy-js/client` package is not directly
responsible for rendering UI. Instead, it lets the end user (you!) pass in a
callback to handle rendering – _e.g._, `() => hydrateRoot(el, <RootOutlet />)`.
In the foregoing example, `RootOutlet` would happen to come from a
React-specific package, _i.e._, `@hwy-js/react`, but it could just as easily be
any other UI rendering library. This may seem like a small detail, but it has
huge benefits in terms of **flexibility and composability**.

If you're server-side rendering (or SSR'ing) your app (defined for our purposes
as generating actual HTML on the server from your app's UI components), then the
callback you provide to `@hwy-js/client` will handle what is commonly referred
to as "hydration". Alternatively, if you're only prefetching data on the server
(but not SSR'ing), then this will be a classic SPA-style client rendering step
(not hydration).

Similar to Hwy's client core, Hwy's core server-side npm package (`hwy`) also
offers a high degree of composability and flexibility. It makes no presumption
about what server framework you're using or how (or even whether) you SSR on
initial page loads. This decoupling allows for maximum flexibility, meaning you
can use Hwy with hono, h3, express, fastify, or really any server framework you
want. Moreover, you can use React, Preact, or any other UI rendering library you
want, by passing in a callback to handle rendering – _e.g._,
`(routeData: RouteData) => renderToPipeableStream(<RootOutlet routeData={routeData} />)`.
Said differently, the Hwy router is just a catch-all endpoint that lives on some
server you fully control, and you can decorate that endpoint handler with
whatever UI rendering logic you want. Currently, Hwy has official integrations
for h3 (the lightweight server framework that underpins Nitro and Nuxt) on the
server (`@hwy-js/h3`) and React for rendering your nested route components
(`@hwy-js/react`).

## SEO-friendly data pre-fetching, backend language agnostic

Whether you're using SSR hydration or classic client-side rendering, **your data
is always pre-fetched concurrently on the server**, so you get fully synchronous
rendering on initial page loads with no waterfalls. Practically speaking, this
means that your page body content is still (at least theoretically) crawlable by
search engines even if you choose to client-side render (CSR) your HTML body.
Additionally, both strategies allow for serving **dynamic, SEO-friendly head
tags** in the initial document payload. This flexibility in rendering strategy
is particularly useful if you want to use **other backend languages** that
aren't able to render JavaScript-driven UI components (for example, if your
backend is written in Go or Rust).

## Quality and sanity first, DX second

Some frameworks seek to provide the best DX humanly possible, while meeting at
least the minimum requirements for performance, clarity, flexibility, and
consistency between dev and prod environments. Hwy flips that around. Hwy seeks
to provide the best balance of performance, clarity, flexibity, and dev/prod
consistency, while meeting at least the minimum requirements for a good DX.

Here's another way to put it. You could look at DX on a 10-minute time scale, or
you could look at DX on a 10-month time scale. Hwy is optimized for the 10-month
time scale.

On a 10-minute time scale, you may be annoyed that Hwy only hot reloads (without
a hard browser refresh) when you edit a CSS file, but does a full hard refresh
when you edit a TypeScript file. Or you might be annoyed that you have to put
your server-only code in separate files from your client code and have to
manually export your loader definitions (unlike Remix and NextJS, which let you
mix server-only code and client code in a single file).

However, on a 10-month time scale using Hwy, there will hopefully have been
exactly zero times where you wasted an afternoon debugging a difference between
dev and prod, exactly zero times where HMR ghosts caused you to question your
sanity, and exactly zero times where you inadvertently leaked server code to the
client. I'd argue that's a better DX on net than the strategy of optimizing for
the 10-minute time scale.

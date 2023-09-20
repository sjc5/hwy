# Hwy

Hwy is a lightweight, flexible, and powerful alternative to NextJS, based on HTMX instead of React.

## Quick Start

```bash
npx create-hwy@latest
```

## What is Hwy?

Hwy is a lot like NextJS or Remix, but it uses HTMX instead of React on the frontend.

Hwy lets you write React-style JSX in nested, file-based routes, with Remix-style loaders and actions.

The backend server is built on Hono, so you have access to a rich, growing ecosystem with lots of middleware and wonderful docs.

Hwy is 100% server-rendered, but with the HTMX defaults Hwy sets up for you out of the box, your app still feels like an SPA.

Links and forms are automatically progressively enhanced thanks to HTMX's hx-boost feature. Just use normal anchor tags and traditional form attributes.

Because Hwy replaces the full page on transitions by default, everything stays simple. You don't have to return different components from different endpoints (unless you want to).

And best of all, anything you can do with Hono or HTMX, you can do with Hwy.

## Features

- Server-rendered JSX / TSX
- Nested, file-based routing
- Remix-style loaders and actions
- Rich Hono middleware ecosystem
- 100% type-safe
- Server built on Hono
- Client built on HTMX
- Built-in critical CSS inlining
- Live browser refresh during development
- And more...

## Guiding Principles

- No speed limits
- Numerous off-ramps
- Smooth, safe roads
- Clear traffic signs

## Simple usage

```tsx
// src/pages/user/$user_id.page.tsx

import type { DataFunctionArgs, PageProps } from 'hwy'
import { UserProfile } from './components.js'

export function loader({ params }: DataFunctionArgs) {
  return await getUser(params.user_id)
}

export default function (props: PageProps<typeof loader>) {
  return <UserProfile user={props.loaderData} />
}
```

## Get Started

If you want to dive right in, just open a terminal and run `npx create-hwy@latest` and follow the prompts.

If you'd prefer to read more first, take a peek at [our docs](https://hwy.dev/docs).

## Acknowledgements

Hwy's APIs are obviously inspired by Remix. If Remix didn't exist, Hwy likely wouldn't exist either. Hwy doesn't use any Remix code, but it still owes a big thanks to the Remix team (past and present) for their top-tier patterns design. If you're building something huge and important today, use Remix.

## Disclaimer

Hwy is in beta! Act accordingly.

## License

MIT

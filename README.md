# Hwy

Hwy is a lightweight, flexible, and powerful alternative to NextJS, based on HTMX instead of React.

## Quick Start

```bash
npx create-hwy@latest
```

## What is Hwy?

Hwy is a lot like NextJS or Remix, but it uses **HTMX** instead of React on the frontend.

Hwy lets you write **React-style JSX** in **nested, file-based routes**, with **Remix-style actions and parallel loaders**.

Page components are async, so you can even **fetch data in JSX** if you really want to! Just make sure to be mindful about waterfalls.

The backend server is built on **Hono**, so you have access to a rich, growing ecosystem with lots of middleware and wonderful docs.

Hwy is **100% server-rendered**, but with the HTMX defaults Hwy sets up for you out of the box, your app still **feels like an SPA**.

Links and forms are automatically **progressively enhanced** thanks to HTMX's `hx-boost` feature. Just use normal anchor tags and traditional form attributes.

Because Hwy replaces the **full page** on transitions by default, everything stays **simple**. You don't have to return different components from different endpoints (unless you want to).

And best of all, **anything you can do with Hono or HTMX, you can do with Hwy**.

## Features

- Server-rendered JSX / TSX
- Nested, file-based routing
- Remix-style actions and parallel loaders
- Async page components
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

Below is an example of a simple Hwy page. You'll notice it looks a lot like Remix, and you're right! Hwy is heavily inspired by Remix, but it uses HTMX instead of React.

```tsx
// src/pages/user/$user_id.page.tsx

import type { DataFunctionArgs, PageProps } from 'hwy'
import { UserProfile } from './components.js'

export async function loader({ params }: DataFunctionArgs) {
  return await getUser(params.user_id)
}

export default async function ({ loaderData }: PageProps<typeof loader>) {
  return <UserProfile user={loaderData} />
}
```

Or, if you prefer to fetch inside your components:

```tsx
import type { PageProps } from 'hwy'
import { UserProfile } from './components.js'

export default async function ({ params }: PageProps) {
  const user = await getUser(params.user_id)

  return <UserProfile user={user} />
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

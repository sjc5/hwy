# 🛣️ Hwy

Hwy is a simple, lightweight, and flexible web framework.

## Quick Start

```bash
npx create-hwy@latest
```

## Features

- Server-rendered
- Nested, file-based routing
- Remix-style actions and parallel loaders
- 100% type-safe
- Built-in critical CSS inlining
- Live browser refresh during development
- And more...

## Simple usage

Below is an example of a simple Hwy page. You'll notice it looks a lot like Remix, and you're right!

```tsx
// SERVER CODE >> src/pages/user/$user_id.data.ts

import type { DataProps } from "hwy";
import { getUser } from "./somewhere.server.js";

export async function loader({ params }: DataProps) {
  return await getUser(params.user_id);
}

// CLENT CODE >> src/pages/user/$user_id.view.tsx

import type { PageProps } from "hwy";
import { UserProfile } from "./somewhere.js";

export default function ({ loaderData }: PageProps<typeof loader>) {
  return <UserProfile user={loaderData} />;
}
```

## Get Started

If you want to dive right in, just open a terminal and run `npx create-hwy@latest` and follow the prompts.

If you'd prefer to read more first, take a peek at [our website](https://hwy.dev).

## Acknowledgements

Hwy's APIs are heavily inspired by Remix. If Remix didn't exist, Hwy likely wouldn't exist either. Hwy doesn't use any Remix code, but it still owes a big thanks to the Remix team (past and present) for their top-tier patterns design. If you're building something huge and important today, use Remix.

## Disclaimer

Hwy is in alpha stage! Act accordingly.

---

Copyright (c) 2023–Present Samuel J. Cook.

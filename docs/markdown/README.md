# Hwy

## What is Hwy?

On the surface, Hwy is a **simple**, **lightweight**, and **flexible** web framework, featuring **nested routing**, **concurrent data pre-fetching**, and optional **server-side rendering**. At a deeper level, Hwy is **just a protocol** for passing nested, prefetched route data between (theoretically) any backend server and any client UI library.

## Features

- Nested, file-based routing
- Optional SSR
- Remix-style actions and parallel loaders
- 100% type-safe
- ESM only
- Server framework and UI library agnostic
- Built-in critical CSS inlining and stylesheet bundling
- CSS hot reloading
- And more...

## Project Goals

- Be boring
- Avoid feature bloat
- Be easy to debug and understand
- Keep dev and prod as identical as possible
- Build on stable, "lowest-common-denominator" primitives
- Be as tech-agnostic as possible
- Change as little as possible over time
- Avoid vendor-specific code
- Prefer dumb solutions over clever ones

## Quick Start

To create a new Hwy app using NodeJS, h3, and React, run the following command:

```bash
npx create-hwy@latest
```

This will simply copy the code contained at `https://github.com/sjc5/hwy/examples/react` into a new directory of your choosing. You can then run `npm install` and `npm run dev` to start the dev server.

## Simple usage

Below is an example of a simple Hwy page at route `your-domain.com/user/123`. You'll notice it looks a lot like Remix, and you're right!

### Server-side data files (for loaders, actions, and head tag definitions)

Hwy's server-side data files live inside the `pages` folder and contain `.data.` before their file extensions. These files are primarily responsible for pre-fetching data that will ultimately be fed into your UI components. Loaders are run concurrently to avoid waterfalls.

```tsx
// src/pages/user/$user_id.data.ts

import type { DataProps } from "hwy";
import { getUser } from "./some-server-side-code.js";

export async function loader({ params }: DataProps) {
  return await getUser(params.user_id);
}
```

### Isomorphic UI files

Hwy's isomorphic UI files live inside the `pages` folder and contain `.ui.` before their file extensions. These files are responsible for rendering the UI. Any data prefetched by the loaders is passed into the UI component as a prop.

```tsx
// src/pages/user/$user_id.ui.tsx

import type { PageProps } from "hwy";
import { UserProfile } from "./some-ui-code.js";

export default function ({ loaderData }: PageProps<typeof loader>) {
  return <UserProfile user={loaderData} />;
}
```

## Project Status

Hwy is in alpha stage and is not recommended for use in production unless you know what you're doing. All APIs are subject to change without notice, so if you do decide to use Hwy, pin your versions, and be prepared to update your code frequently.

Additionally, Hwy is not currently open for contributions. If you have a feature request or bug report, please open an issue on GitHub.

---

Copyright (c) 2023–Present Samuel J. Cook.

import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
import { CodeBlock } from "../components/code-block.js";
import { AnchorHeading } from "../components/anchor-heading.js";
import { Paragraph } from "../components/paragraph.js";
import { InlineCode } from "../components/inline-code.js";
import { ListItem, UnorderedList } from "../components/unordered-list.js";
import { Boldtalic } from "../components/bold-italic.js";
export const head = () => {
    return [
        { title: "Hwy Framework Docs" },
        {
            tag: "meta",
            props: {
                name: "description",
                content: "Documentation for the Hwy framework, a simple, lightweight, and flexible web framework, built on Hono and HTMX.",
            },
        },
    ];
};
export default function () {
    return (_jsxs("div", { class: "space-y-6", children: [_jsx("h2", { class: "text-3xl font-bold mb-4", children: "Docs" }), _jsx(AnchorHeading, { content: "Creating a new project" }), _jsx(Paragraph, { children: "To create a new project, open a terminal and run the following commands (adjust as appropriate for your preferred package manager):" }), _jsx(CodeBlock, { language: "bash", code: `npx create-hwy@latest\nnpm i\nnpm run dev` }), _jsx(AnchorHeading, { content: "Project structure" }), _jsx(Paragraph, { children: "A simple Hwy project is structured like this:" }), _jsx(CodeBlock, { language: "bash", code: `
root
├── public/
│   ├── favicon.ico
├── src/
│   ├── pages/
│   │   ├── _index.page.tsx
│   │   ├── $.page.tsx
│   ├── styles/
│   │   ├── global.bundle.css
│   │   ├── global.critical.css
│   ├── client.entry.ts
│   ├── main.tsx
│   .gitignore
│   ...
        ` }), _jsxs(Paragraph, { children: ["The ", _jsx(InlineCode, { children: "public" }), " directory is where you'll put static, public assets, such as favicons, opengraph images, font files, etc."] }), _jsxs(Paragraph, { children: ["The ", _jsx(InlineCode, { children: "src" }), " directory is where you'll put your source files. Most of the structure is completely up to you, but there are a few conventions that Hwy expects."] }), _jsx(AnchorHeading, { content: "Pages directory" }), _jsxs(Paragraph, { children: ["First, you must have a ", _jsx(InlineCode, { children: "src/pages" }), " directory. This is where you'll put your page files. This is similar to the \"routes\" directory in Remix."] }), _jsxs(Paragraph, { children: ["The rules are very simple:", _jsxs(UnorderedList, { children: [_jsxs(ListItem, { children: ["Pages should include ", _jsx(InlineCode, { children: ".page." }), " (e.g.,", _jsx(InlineCode, { children: "about.page.tsx" }), ") in the filename. If you want co-location in this directory, you can always just exclude the", " ", _jsx(InlineCode, { children: ".page." }), " part in any filename (e.g.,", _jsx(InlineCode, { children: "about-components.tsx" }), ")."] }), _jsxs(ListItem, { children: ["Directory names will become part of the path, unless they are prefixed with double underscores. For example, if you have a", " ", _jsx(InlineCode, { children: "src/pages/foo" }), " directory, and a file inside the ", _jsx(InlineCode, { children: "foo" }), " directory called", " ", _jsx(InlineCode, { children: "bar.page.tsx" }), " (", _jsx(InlineCode, { children: "/src/pages/foo/bar.page.tsx" }), "), the path would be ", _jsx(InlineCode, { children: "example.com/foo/bar" }), ". If you want the directory to be ignored, prefix it with two underscores (e.g., ", _jsx(InlineCode, { children: "__foo" }), "). In that case, the route will just be ", _jsx(InlineCode, { children: "example.com/bar" }), "."] }), _jsxs(ListItem, { children: ["If you want a default index page inside at any route, just include an ", _jsx(InlineCode, { children: "_index.page.tsx" }), " file in that directory. This includes the ", _jsx(InlineCode, { children: "pages" }), " directory itself;", " ", _jsx(InlineCode, { children: "/src/pages/_index.page.tsx" }), " will be the default route for your site."] }), _jsxs(ListItem, { children: ["If you want to include a layout for a route (e.g., a sidebar or sub-navigation), include a file with the same name as the directory (but with ", _jsx(InlineCode, { children: ".page.tsx" }), " included) as a sibling to the route directory. For example, if you have a route at", " ", _jsx(InlineCode, { children: "/foo/bar" }), ", you can include a layout at", _jsx(InlineCode, { children: "/src/pages/foo/bar.page.tsx" }), " and a default page at ", _jsx(InlineCode, { children: "/src/pages/foo/bar/_index.page.tsx" }), ". Note that any layouts for your main home page (", _jsx(InlineCode, { children: "src/_index.page.tsx" }), "), such as a global navigation header, should be inserted into your root component that is rendered from your main server entry point (i.e.,", " ", _jsx(InlineCode, { children: "src/main.tsx" }), ")."] }), _jsxs(ListItem, { children: ["If you want to include dynamic child routes, you can just prefix the file name with a dollar sign (", _jsx(InlineCode, { children: "$" }), "). For example, if you have a route at ", _jsx(InlineCode, { children: "/foo/bar" }), ", you can include a dynamic child route at", " ", _jsx(InlineCode, { children: "/src/pages/foo/bar/$id.page.tsx" }), ". This will match any route that starts with ", _jsx(InlineCode, { children: "/foo/bar/" }), " ", "and will pass the id as a parameter to the page (including the page's loader, action, and component... more on this later). The", " ", _jsx(InlineCode, { children: "/foo/bar" }), " route will still render the index page, if you have one.", _jsx("br", {}), _jsx("br", {}), "NOTE: One \"gotcha\" with this is that you need to use a string that would be safe to use as a JavaScript variable for your dynamic properties. For example,", " ", _jsx(InlineCode, { children: "/src/pages/$user_id.page.tsx" }), " would be fine, but ", _jsx(InlineCode, { children: "/src/pages/$user-id.page.tsx" }), " would not."] }), _jsxs(ListItem, { children: ["If you want to have \"catch-all\" or \"splat\" routes, you can include a file named simply ", _jsx(InlineCode, { children: "$.page.tsx" }), ". This will match any route that hasn't already been matched by a more specific route. You can also include a top-level 404 page by including a file named ", _jsx(InlineCode, { children: "$.page.tsx" }), " in", " ", _jsx(InlineCode, { children: "src/pages" }), ". Any splat parameters \"caught\" by one of these routes will be passed into the page."] })] })] }), _jsx(AnchorHeading, { content: "Page components" }), _jsxs(Paragraph, { children: ["Pages are very simple as well. They are simply JSX components default exported from a page route file. Again, a page route file is any file in the ", _jsx(InlineCode, { children: "src/pages" }), " directory that includes", " ", _jsx(InlineCode, { children: ".page." }), " in the filename. For example,", _jsx(InlineCode, { children: "src/pages/about.page.tsx" }), " is a page file."] }), _jsx(CodeBlock, { language: "typescript", code: `
// src/pages/about.page.tsx

export default function () {
  return (
    <p>
      I like baseball.
    </p>
  )
}
        ` }), _jsxs(Paragraph, { children: ["Pages are passed a ", _jsx(InlineCode, { children: "PageProps" }), " object, which contains a bunch of helpful properties. Here are all the properties available on the PageProps object:"] }), _jsx(CodeBlock, { language: "typescript", code: `
export default function ({
  c,
  loaderData,
  actionData,
  outlet,
  params,
  path,
  splatSegments,
}: PageProps<typeof loader, typeof action>) {
  return (
    <p>
      I like {loaderData?.sport}.
    </p>
  )
}
        ` }), _jsx(Paragraph, { children: _jsxs(UnorderedList, { children: [_jsxs(ListItem, { children: [_jsx(InlineCode, { children: "c" }), " - This is the Hono Context object. It contains the request and response objects, as well as some other useful properties and methods. See the", " ", _jsx("a", { href: "https://hono.dev", target: "_blank", class: "underline", children: "Hono docs" }), " ", "for more info."] }), _jsxs(ListItem, { children: [_jsx(InlineCode, { children: "loaderData" }), " - This is the data returned from the route loader. If you aren't using a route loader, this will be", " ", _jsx(InlineCode, { children: "undefined" }), ". If you are using a route loader and pass in ", _jsx(InlineCode, { children: "typeof loader" }), " as a generic to", " ", _jsx(InlineCode, { children: "PageProps" }), ", this will be 100% type-safe."] }), _jsxs(ListItem, { children: [_jsx(InlineCode, { children: "actionData" }), " - Same as", " ", _jsx(InlineCode, { children: "loaderData" }), ", except in this case the data comes from your route's action, if applicable. If you are using a route action but ", _jsx(Boldtalic, { children: "not" }), " a route loader, this is how you'd handle the generics:", " ", _jsx(InlineCode, { children: `PageProps<never, typeof action>` }), "."] }), _jsxs(ListItem, { children: [_jsx(InlineCode, { children: "outlet" }), " - This is the outlet for the page, and it's where child routes get rendered. Because page components are async, you should render outlets like this:", " ", _jsx(InlineCode, { children: `{await outlet()}` }), ", regardless of whether you're actually doing anything asynchronous inside of them."] }), _jsxs(ListItem, { children: [_jsx(InlineCode, { children: "params" }), " - This is an object containing any parameters passed to the page. For example, if you have a page at", " ", _jsx(InlineCode, { children: "src/pages/foo/bar/$id.page.tsx" }), ", the", " ", _jsx(InlineCode, { children: "params" }), " object will contain a property called ", _jsx(InlineCode, { children: "id" }), " with the value of the", " ", _jsx(InlineCode, { children: "id" }), " parameter. In other words, if the user visits the route ", _jsx(InlineCode, { children: "example.com/foo/bar/123" }), ", the ", _jsx(InlineCode, { children: "params" }), " object will be", " ", _jsx(InlineCode, { children: `{ id: '123' }` }), "."] }), _jsxs(ListItem, { children: [_jsx(InlineCode, { children: "splatSegments" }), " - This is an array of any \"splat\" segments caught by the \"deepest\" splat route. For example, if you have a page at", " ", _jsx(InlineCode, { children: "src/pages/foo/bar/$.page.tsx" }), " (a splat route) and the user visits", " ", _jsx(InlineCode, { children: "example.com/foo/bar/123/456" }), ", the", " ", _jsx(InlineCode, { children: "splatSegments" }), " array will be", " ", _jsx(InlineCode, { children: `['123', '456']` }), "."] })] }) }), _jsxs(Paragraph, { children: [_jsx(InlineCode, { children: "PageProps" }), " is also a generic type, which takes", " ", _jsx(InlineCode, { children: "typeof loader" }), " and", " ", _jsx(InlineCode, { children: "typeof action" }), " as its two parameters, respectively. These are the types of the loader and action functions for the page (more on this later). If you aren't using data functions for a certain page, you can just skip the generics."] }), _jsx(Paragraph, { children: "One cool thing about Hwy is that you have access to the Hono Context from within your page components. This means you can do things like set response headers right inside your page components. You can also do this from loaders and actions if you prefer." }), _jsx(CodeBlock, { language: "typescript", code: `
import { PageProps } from 'hwy'

export default function ({ c }: PageProps) {
  c.res.headers.set('cache-control', 'whatever')

  return <Whatever />
}
        ` }), _jsx(AnchorHeading, { content: "Page loaders" }), _jsxs(Paragraph, { children: ["Page loaders are functions named \"loader\" that are exported from a page file. They are passed a subset of the PageProps object:", " ", _jsx(InlineCode, { children: "c" }), ", ", _jsx(InlineCode, { children: "params" }), ", and", " ", _jsx(InlineCode, { children: "splatSegments" }), ". The typescript type exported by Hwy for this object is called ", _jsx(InlineCode, { children: "DataFunctionArgs" }), ", which can take an optional generic of your Hono Env type (see the Hono docs for more details on that, and why you might want to do that)."] }), _jsx(Paragraph, { children: "Loaders run before your page is returned, and they all run in parallel. They are useful for fetching data, and any data returned from a loader will be passed to its associated page component. They can also be useful for redirecting to another page (covered a little later)." }), _jsx(Paragraph, { children: "If you want to consume data from a loader in your page component (usually you will), then you should just return standard raw data from the loader, like this:" }), _jsx(CodeBlock, { language: "typescript", code: `
import type { DataFunctionArgs } from 'hwy'

export function loader({ c }: DataFunctionArgs) {
  return "baseball" as const
}

export default function ({ loaderData }: PageProps<typeof loader>) {
  return (
    <p>
      I like {loaderData}. // I like baseball.
    </p>
  )
}
` }), _jsx(Paragraph, { children: "If you return a Response object, then that will \"take over\" and be returned from the route instead of your page. This is fine if you're creating a \"resource route\" (more on this below), but usually it's not what you want." }), _jsx(Paragraph, { children: "However, one thing that is more common is that you may want to return a redirect from a loader. You can do this with a Response object if you want, but Hwy exports a helper function that covers more edge cases and is built to work nicely with the HTMX request lifecycle." }), _jsx(CodeBlock, { language: "typescript", code: `
import { redirect, type DataFunctionArgs } from 'hwy'

export function loader({ c }: DataFunctionArgs) {
  return redirect({ c, to: '/login' })
}
` }), _jsxs(Paragraph, { children: ["You can also \"throw\" a ", _jsx(InlineCode, { children: "redirect" }), " if you want, which can be helpful in keeping your typescript types clean."] }), _jsx(AnchorHeading, { content: "Server components" }), _jsx(Paragraph, { children: "In addition to using loaders to load data in parallel before rendering any components, you can also load data inside your Hwy page components. Be careful with this, as it can introduce waterfalls, but if you are doing low-latency data fetching and prefer that pattern, it's available to you in Hwy." }), _jsx(CodeBlock, { language: "typescript", code: `
// src/some-page.page.tsx

export default async function ({ outlet }: PageProps) {
  const someData = await getSomeData()

  return (
    <div>
      {JSON.stringify(someData)}

      {await outlet()}
    </div>
  )
}
      ` }), _jsx(Paragraph, { children: "You can also pass data to the child outlet if you want, and it will be available in the child page component's props. Here's how that would look in the parent page component:" }), _jsx(CodeBlock, { language: "typescript", code: `{await outlet({ someData })}` }), _jsxs(Paragraph, { children: ["And in the child component, you'll want to use", " ", _jsx(InlineCode, { children: `PageProps & { someData: SomeType }` }), " as your prop type."] }), _jsxs(Paragraph, { children: ["Because page components are async and let you fetch data inside them, be sure to always await your ", _jsx(InlineCode, { children: "outlet" }), " calls, like this: ", _jsx(InlineCode, { children: `{await outlet()}` }), ". If you don't, things might not render correctly."] }), _jsxs(Paragraph, { children: ["Another way of doing this would be to use Hono's", " ", _jsx(InlineCode, { children: "c.set('some-key', someData)" }), " feature. If you do that, any child component will be able to access the data without re-fetching via ", _jsx(InlineCode, { children: "c.get('some-key')" }), "."] }), _jsx(Paragraph, { children: "The world is your oyster!" }), _jsx(AnchorHeading, { content: "Page actions" }), _jsx(Paragraph, { children: "Page actions behave just like loaders, except they don't run until you call them (usually from a form submission). Loaders are for loading/fetching data, and actions are for mutations. Use actions when you want to log users in, mutate data in your database, etc." }), _jsxs(Paragraph, { children: ["Data returned from an action will be passed to the page component as the", " ", _jsx(InlineCode, { children: "actionData" }), " property on the", " ", _jsx(InlineCode, { children: "PageProps" }), " object. Unlike loaders, which are designed to run in parallel and pass different data to each nested component, actions are called individually and return the same", " ", _jsx(InlineCode, { children: "actionData" }), " to all nested components."] }), _jsx(Paragraph, { children: "Here is an example page with a login form. Note that this is highly simplified and not intended to be used in production. It is only intended to show how actions work." }), _jsx(CodeBlock, { language: "typescript", code: `
import { DataFunctionArgs, PageProps } from 'hwy'
import { extractFormData, logUserIn } from './pretend-lib.js'

export async function action({ c }: DataFunctionArgs) {
  const { email, password } = await extractFormData({ c })
  return await logUserIn({ email, password })
}

export default function ({ actionData }: PageProps<never, typeof action>) {
  if (actionData?.success) return <p>Success!</p>

  return (
    <form action="/login" method="POST">
      <input name="email" type="email" />
      <input name="password" type="password" />
      <button type="submit">Login</button>
    </form>
  )
}
      ` }), _jsxs(Paragraph, { children: ["This form uses 100% standard html attributes, and it will be automatically progressively enhanced by HTMX (uses the", " ", _jsx(InlineCode, { children: "hx-boost" }), " feature). If JavaScript doesn't load for some reason, it will fall back to traditional web behavior (full-page reload)."] }), _jsx(AnchorHeading, { content: "Resource routes" }), _jsx(Paragraph, { children: "Remix has the concept of \"resource routes\", where you can define loaders and actions without defining a default export component, and then use them to build a view-less API." }), _jsxs(Paragraph, { children: ["In Hwy, you're probably better off just using your Hono server directly for this, as it's arguably more traditional, straightforward, and convenient. However, if you really want to use resource routes with Hwy's file-based routing, nothing is stopping you! You can do so by just making sure you return a fetch ", _jsx(InlineCode, { children: "Response" }), " object from your loader or action. For example:"] }), _jsx(CodeBlock, { language: "typescript", code: `
// src/pages/api/example-resource-root.ts

export function loader() {
  return new Response('Hello from resource route!')
}
` }), _jsxs(Paragraph, { children: ["All of that being said, Hwy is designed to work with HTMX-style hypermedia APIs, not JSON APIs. So if you return JSON from a resource route or a normal Hono endpoint, you'll be in charge of handling that on the client side. This will likely entail disabling HTMX on the form submission, doing an ", _jsx(InlineCode, { children: "e.preventDefault()" }), " in the form's onsubmit handler, and then doing a standard fetch request to the Hono endpoint. You can then parse the JSON response and do whatever you want with it."] }), _jsx(Paragraph, { children: "You probably don't need to do this, and if you think you do, I would challenge you to try using the hypermedia approach instead. If you still decide you need to use JSON, this is roughly the escape hatch." }), _jsx(AnchorHeading, { content: "Error boundaries" }), _jsxs(Paragraph, { children: ["Any Hwy page can export an ", _jsx(InlineCode, { children: "ErrorBoundary" }), " ", "component, which takes the same parameters as", " ", _jsx(InlineCode, { children: "loaders" }), " and ", _jsx(InlineCode, { children: "actions" }), ", as well as the error itself. The type for the ErrorBoundary component props is exported as ", _jsx(InlineCode, { children: "ErrorBoundaryProps" }), ". If an error is thrown in the page or any of its children, the error will be caught and passed to the nearest applicable parent error boundary component. You can also pass a default error boundary component that effectively wraps your outermost ", _jsx(InlineCode, { children: "rootOutlet" }), " (in", " ", _jsx(InlineCode, { children: "main.tsx" }), ") like so:"] }), _jsx(CodeBlock, { language: "typescript", code: `
import type { ErrorBoundaryProps } from 'hwy'

...

{await rootOutlet({
  activePathData,
  c,
  fallbackErrorBoundary: (props: ErrorBoundaryProps) => {
    return <div>{props.error.message}</div>
  },
})}
      ` }), _jsx(AnchorHeading, { content: "Hono middleware and variables" }), _jsx(Paragraph, { children: "You will very likely find yourself in a situation where there is some data you'd like to fetch before you even run your loaders, and you'd like that data to be available in all downstream loaders and page components. Here's how you might do it:" }), _jsx(CodeBlock, { language: "typescript", code: `
app.use('*', async (c, next) => {
  const user = await getUserFromCtx(c)

  c.set('user', user)

  await next()
})
` }), _jsx(Paragraph, { children: "This isn't very typesafe though, so you'll want to make sure you create app-specific types. For this reason, all Hwy types that include the Hono Context object are generic, and you can pass your app-specific Hono Env type as a generic to the PageProps object. For example:" }), _jsx(CodeBlock, { language: "typescript", code: `
import type { DataFunctionArgs } from 'hwy'

type AppEnv = {
  Variables: {
    user: Awaited<ReturnType<typeof getUserFromCtx>>
  }
}

type AppDataFunctionArgs = DataFunctionArgs<AppEnv>

export async function loader({ c }: AppDataFunctionArgs) {
  // this will be type safe!
  const user = c.get('user')
}
` }), _jsx(AnchorHeading, { content: "Main.tsx" }), _jsxs(Paragraph, { children: ["In your ", _jsx(InlineCode, { children: "main.tsx" }), " file, you'll have a handler that looks something like this."] }), _jsx(CodeBlock, { language: "typescript", code: `
import {
  CssImports,
  rootOutlet,
  DevLiveRefreshScript,
  ClientScripts,
  getDefaultBodyProps,
  renderRoot,
} from 'hwy'

app.all('*', async (c, next) => {
  return await renderRoot(c, next, async ({ activePathData }) => {
    return (
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />

          <HeadElements
            c={c}
            activePathData={activePathData}
            defaults={defaultHeadBlocks}
          />

          <CssImports />
          <ClientScripts activePathData={activePathData} />
          <DevLiveRefreshScript />
        </head>

        <body {...getDefaultBodyProps()}>
          {await rootOutlet({
            c,
            activePathData,
            fallbackErrorBoundary: () => {
              return <div>Something went wrong!</div>
            },
          })}
        </body>
      </html>
    )
  }
})
      ` }), _jsxs(Paragraph, { children: ["The easiest way to get this set up correctly is to bootstrap your app with ", _jsx(InlineCode, { children: "npx create-hwy@latest" }), "."] }), _jsx(AnchorHeading, { content: "Document head (page metadata)" }), _jsxs(Paragraph, { children: ["Your document's ", _jsx(InlineCode, { children: "head" }), " is rendered via the", " ", _jsx(InlineCode, { children: `HeadElements` }), " component in your", " ", _jsx(InlineCode, { children: "main.tsx" }), " file, like this:"] }), _jsx(CodeBlock, { language: "typescript", code: `
<HeadElements
  activePathData={activePathData}
  c={c}
  defaults={[
    { title: 'Hwy Framework' },
    {
      tag: 'meta',
      props: {
        name: 'description',
        content:
          'Hwy is a simple, lightweight, and flexible web framework, built on Hono and HTMX.',
      },
    },
  ]}
/>
      ` }), _jsx(Paragraph, { children: "As you can probably see, the \"defaults\" property takes an array of head elements. \"Title\" is a special one, in that it is just an object with a title key. Other elements are just objects with a tag and props key. The props key is an object of key-value pairs that will be spread onto the element." }), _jsxs(Paragraph, { children: ["The defaults you set here can be overridden at any Hwy page component by exporting a ", _jsx(InlineCode, { children: "head" }), " function. For example:"] }), _jsx(CodeBlock, { language: "typescript", code: `
import { HeadFunction } from 'hwy'

export const head: HeadFunction = (props) => {
  // props are the same as PageProps, but without the outlet

  return [
    { title: 'Some Child Page' },
    {
      tag: 'meta',
      props: {
        name: 'description',
        content:
          'Description for some child page.',
      },
    },
  ]
}
` }), _jsxs(Paragraph, { children: ["This will override any conflicting head elements set either by an ancestor page component or by the root defaults. The", " ", _jsx(InlineCode, { children: "head" }), " function is passed all the same props as a page component, excluding ", _jsx(InlineCode, { children: "outlet" }), "."] }), _jsx(AnchorHeading, { content: "Styling" }), _jsxs(Paragraph, { children: ["Hwy includes built-in support for several CSS patterns, including a very convenient way to inline critical CSS. CSS is rendered into your app through the ", _jsx(InlineCode, { children: "CssImports" }), " component. That component in turn reads from the ", _jsx(InlineCode, { children: "src/styles" }), " ", "directory, which is where you should put your CSS files. Inside the styles directory, you can put two types of CSS files:", " ", _jsx(InlineCode, { children: "critical" }), " and ", _jsx(InlineCode, { children: "bundle" }), ". Any files that include ", _jsx(InlineCode, { children: ".critical." }), " in the filename will be concatenated (sorted alphabetically by file name), processed by esbuild, and inserted inline into the", " ", _jsx(InlineCode, { children: "head" }), " of your document. Any files that include", " ", _jsx(InlineCode, { children: ".bundle." }), " in the filename will similarly be concatenated (sorted alphabetically by file name), processed by esbuild, and inserted as a standard linked stylesheet in the", " ", _jsx(InlineCode, { children: "head" }), " of your document."] }), _jsxs(Paragraph, { children: ["It's also very easy to configure Tailwind, if that's your thing. To see how this works, spin up a new project with", " ", _jsx(InlineCode, { children: "npx create-hwy@latest" }), " and select \"Tailwind\" when prompted."] }), _jsx(Paragraph, { children: "And of course, if you don't like these patterns, you can just choose not to use them, and do whatever you want for styling instead!" }), _jsx(AnchorHeading, { content: "Deployment" }), _jsxs(Paragraph, { children: ["Hwy can be deployed to any Node-compatible runtime with filesystem read access. This includes more traditional Node app hosting like Render.com or Railway.app, or Vercel (Lambda), or Deno Deploy. This should also include Bun once that ecosystem becomes more stable and has more hosting options. Just choose your preferred deployment target when you run", " ", _jsx(InlineCode, { children: "npx create-hwy@latest" }), "."] }), _jsx(Paragraph, { children: "Cloudflare is a bit trickier, however, because Hwy reads from the filesystem at runtime. We may add support for this in the future through a specialized build step, but for now, it's not supported. This also means that Vercel edge functions are not supported, as they rely on Cloudflare Workers, which do not have runtime read access to the filesystem. Normal Vercel serverless, which runs on AWS Lambda under the hood, will work just fine." }), _jsx(AnchorHeading, { content: "Progressive enhancement" }), _jsxs(Paragraph, { children: ["When you included the ", _jsx(InlineCode, { children: "hx-boost" }), " attribute on the", " ", _jsx(InlineCode, { children: "body" }), " tag (included by default when you use", " ", _jsx(InlineCode, { children: "getDefaultBodyProps" }), "), anchor tags (links) and form submissions will be automatically progressively enhanced. For forms, include the traditional attributes, like this:", _jsx(CodeBlock, { language: "typescript", code: `<form action="/login" method="POST">` })] }), _jsx(AnchorHeading, { content: "Random" }), _jsx(Paragraph, { children: "Here is some random stuff that is worth noting, but doesn't fit well into any existing sections." }), _jsxs(UnorderedList, { children: [_jsx(ListItem, { children: "HTMX handles scroll restoration for you!" }), _jsx(ListItem, { children: "Code splitting is not a concern with this architecture." }), _jsxs(ListItem, { children: [_jsx(InlineCode, { children: "@hwy/dev" }), " is in a separate package so that it doesn't need to be loaded in production. This probably doesn't matter much, but theoretically it could help with cold starts if you're deploying to serverless."] }), _jsx(ListItem, { children: "Never have to fix a hydration error again." })] }), _jsx(AnchorHeading, { content: "Using Hwy without HTMX" }), _jsxs(Paragraph, { children: ["If you would like to use Hwy like a traditional MPA framework, and skip using HTMX, you can do so simply by excluding HTMX from your", " ", _jsx(InlineCode, { children: "src/client.entry.ts" }), " file."] }), _jsx(AnchorHeading, { content: "Security" }), _jsx(Paragraph, { children: "A few points on security:" }), _jsxs(UnorderedList, { children: [_jsxs(ListItem, { children: [_jsx(Paragraph, { children: "Similar to React, Hono JSX rendering will automatically escape the outputted html. If you want to render scripts, you should do the classic React thing (works the same with Hono JSX):" }), _jsx("br", {}), _jsx(CodeBlock, { language: "typescript", code: `
<script
  dangerouslySetInnerHTML={{
    __html: \`console.log('hello world')\`,
  }}
/>
        ` })] }), _jsx(ListItem, { children: "When you implement auth in your app, make sure you consider CSRF protection. Hwy isn't doing anything special there. It's your responsibility to get that right." }), _jsxs(ListItem, { children: ["When you use ", _jsx(InlineCode, { children: "npx create-hwy@latest" }), ", we include the Hono secure headers middleware for you. Please see the Hono docs for more info on what that is doing, and make sure it's appropriate for your use case."] })] }), _jsx(AnchorHeading, { content: "Self-vendoring" }), _jsxs(Paragraph, { children: ["If you would like to self-vendor your dependencies instead of using a", " ", _jsx(InlineCode, { children: "src/client.entry.ts" }), " file (which is bundled with esbuild), you can do so simply by including your dependencies in the", " ", _jsx(InlineCode, { children: "/public" }), " directory and referencing them in a script. For example:", _jsx(CodeBlock, { language: "typescript", code: `
<script
  src={getPublicUrl('your-script.js')}
  defer
/>
        ` })] }), _jsx(AnchorHeading, { content: "Roadmap" }), _jsx(Paragraph, { children: "Other than the obvious (stabilize APIs, more tests, better docs, etc.), here are a few things open for consideration on the roadmap:" }), _jsxs(UnorderedList, { children: [_jsxs(ListItem, { children: ["A simple solution for identifying \"active\" navigation links, similar perhaps to Remix's ", _jsx(InlineCode, { children: "NavItem" }), " component. For now, it shouldn't be too hard to build one yourself."] }), _jsx(ListItem, { children: "It would be nice to have a built-in solution for link prefetching." }), _jsx(ListItem, { children: "What else? You tell me!" })] })] }));
}

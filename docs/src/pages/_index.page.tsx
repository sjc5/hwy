import { Boldtalic } from '../components/bold-italic.js'
import { CodeBlock } from '../components/code-block.js'
import { InlineCode } from '../components/inline-code.js'
import { Paragraph } from '../components/paragraph.js'
import { ListItem, UnorderedList } from '../components/unordered-list.js'

export default function () {
  return (
    <>
      <h1 class="text-3xl lg:text-4xl leading-snug lg:leading-normal opacity-[0.95] py-6">
        Hwy is a <Boldtalic>lightweight</Boldtalic>,{' '}
        <Boldtalic>flexible</Boldtalic>, and <Boldtalic>powerful</Boldtalic>{' '}
        alternative to NextJS, based on <Boldtalic>HTMX</Boldtalic> instead of
        React.
      </h1>

      <div class="flex flex-col gap-4">
        <h3 class="text-2xl uppercase font-bold underline-offset-4 underline italic mb-3">
          Quickstart
        </h3>

        <InlineCode class="self-start text-xl italic font-bold" high_contrast>
          npx create-hwy@latest
        </InlineCode>
      </div>

      <div class="flex flex-col gap-4">
        <h3 class="text-2xl uppercase font-bold underline-offset-4 underline italic">
          What is Hwy?
        </h3>

        <Paragraph>
          Hwy is a lot like NextJS or Remix, but it uses{' '}
          <Boldtalic>HTMX</Boldtalic> instead of React on the frontend.
        </Paragraph>

        <Paragraph>
          Hwy lets you write <Boldtalic>React-style JSX</Boldtalic> in{' '}
          <Boldtalic>nested, file-based routes</Boldtalic>, with{' '}
          <Boldtalic>Remix-style actions and parallel loaders</Boldtalic>.
        </Paragraph>

        <Paragraph>
          Page components are async, so you can even{' '}
          <Boldtalic>fetch data in JSX</Boldtalic> if you want to (just be
          careful with waterfalls).
        </Paragraph>

        <Paragraph>
          The backend server is built on <Boldtalic>Hono</Boldtalic>, so you
          have access to a rich, growing ecosystem with lots of middleware and
          wonderful docs.
        </Paragraph>

        <Paragraph>
          Hwy is <Boldtalic>100% server-rendered</Boldtalic>, but with the HTMX
          defaults Hwy sets up for you out of the box, your app still{' '}
          <Boldtalic>feels like an SPA</Boldtalic>.
        </Paragraph>

        <Paragraph>
          Links and forms are automatically{' '}
          <Boldtalic>progressively enhanced</Boldtalic> thanks to HTMX's{' '}
          <InlineCode>hx-boost</InlineCode> feature. Just use normal anchor tags
          and traditional form attributes.
        </Paragraph>

        <Paragraph>
          Because Hwy replaces the <Boldtalic>full page</Boldtalic> on
          transitions by default, everything stays <Boldtalic>simple</Boldtalic>
          . You don't have to return different components from different
          endpoints (unless you want to).
        </Paragraph>

        <Paragraph>
          And best of all,{' '}
          <Boldtalic>
            anything you can do with Hono or HTMX, you can do with Hwy
          </Boldtalic>
          .
        </Paragraph>
      </div>

      <div>
        <h3 class="text-2xl mb-4 uppercase font-bold underline-offset-4 underline italic">
          Features
        </h3>

        <UnorderedList class="!space-y-0">
          <ListItem>Server-rendered JSX / TSX</ListItem>
          <ListItem>Nested, file-based routing</ListItem>
          <ListItem>Remix-style actions and parallel loaders</ListItem>
          <ListItem>Async page components</ListItem>
          <ListItem>Rich Hono middleware ecosystem</ListItem>
          <ListItem>100% type-safe</ListItem>
          <ListItem>Server built on Hono</ListItem>
          <ListItem>Client built on HTMX</ListItem>
          <ListItem>Built-in critical CSS inlining</ListItem>
          <ListItem>Live browser refresh during development</ListItem>
          <ListItem>And more...</ListItem>
        </UnorderedList>
      </div>

      <div>
        <h3 class="text-2xl mb-4 uppercase font-bold underline-offset-4 underline italic">
          Guiding principles
        </h3>

        <UnorderedList class="!space-y-0">
          <ListItem>No speed limits</ListItem>
          <ListItem>Numerous off-ramps</ListItem>
          <ListItem>Smooth, safe roads</ListItem>
          <ListItem>Clear traffic signs</ListItem>
        </UnorderedList>
      </div>
      <div>
        <h3 class="text-2xl mb-4 uppercase font-bold underline-offset-4 underline italic">
          Simple usage
        </h3>

        <Paragraph class="mb-6">
          Below is an example of a simple Hwy page. You'll notice it looks a lot
          like Remix, and you're right! Hwy is heavily inspired by Remix, but it
          uses HTMX instead of React.
        </Paragraph>

        <CodeBlock
          language="typescript"
          code={`
// src/pages/user/$user_id.page.tsx

import type { DataFunctionArgs, PageProps } from 'hwy'
import { UserProfile } from './components.js'

export async function loader({ params }: DataFunctionArgs) {
  return await getUser(params.user_id)
}

export default function ({ loaderData }: PageProps<typeof loader>) {
  return <UserProfile user={loaderData} />
}
`}
        />

        <Paragraph class="my-6">
          Or, if you prefer to fetch inside your components:
        </Paragraph>

        <CodeBlock
          language="typescript"
          code={`
import type { PageProps } from 'hwy'
import { UserProfile } from './components.js'

export default async function ({ params }: PageProps) {
  const user = await getUser(params.user_id)

  return <UserProfile user={user} />
}
`}
        />
      </div>

      <div class="flex flex-col gap-4">
        <h3 class="text-2xl uppercase font-bold underline-offset-4 underline italic">
          Get Started
        </h3>
        <Paragraph>
          If you want to dive right in, just open a terminal and run{' '}
          <InlineCode>npx create-hwy@latest</InlineCode> and follow the prompts.
        </Paragraph>

        <Paragraph>
          If you'd prefer to read more first, take a peek at{' '}
          <a href="/docs" class="underline">
            our docs
          </a>
          .
        </Paragraph>
      </div>

      <div>
        <h3 class="text-2xl mb-4 uppercase font-bold underline-offset-4 underline italic">
          Acknowledgements
        </h3>

        <Paragraph>
          Hwy's APIs are obviously inspired by Remix. If Remix didn't exist, Hwy
          likely wouldn't exist either. Hwy doesn't use any Remix code, but it
          still owes a big thanks to the Remix team (past and present) for their
          top-tier patterns design. If you're building something huge and
          important today, use Remix.
        </Paragraph>
      </div>

      <div>
        <h3 class="text-2xl mb-4 uppercase font-bold underline-offset-4 underline italic">
          Disclaimer
        </h3>

        <Paragraph>Hwy is in beta! Act accordingly.</Paragraph>
      </div>
    </>
  )
}

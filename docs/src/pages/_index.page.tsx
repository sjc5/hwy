import { Boldtalic } from "../components/bold-italic.js";
import { CodeBlock } from "../components/code-block.js";
import { H3Wrapper } from "../components/h3-wrapper.js";
import { InlineCode } from "../components/inline-code.js";
import { Link } from "../components/link.js";
import { Paragraph } from "../components/paragraph.js";

export default function () {
  return (
    <>
      <BigHeading />
      <BundleBadge />
      <Quickstart />
      <Acknowledgements />
      <Features />
      <SimpleUsage />
    </>
  );
}

function BigHeading() {
  return (
    <h1 class="big-heading">
      Hwy is a <Boldtalic>simple</Boldtalic>, <Boldtalic>lightweight</Boldtalic>
      , and <Boldtalic>flexible</Boldtalic> full-stack web framework, built on{" "}
      <Link href="https://hono.dev" target="_blank">
        <Boldtalic>Hono</Boldtalic>
      </Link>{" "}
      and{" "}
      <Link href="https://htmx.org" target="_blank">
        <Boldtalic>HTMX</Boldtalic>
      </Link>
      .
    </h1>
  );
}

function BundleBadge() {
  return (
    <a
      href="https://pkg-size.dev/hwy"
      target="_blank"
      style={{ alignSelf: "start" }}
    >
      <img
        style={{
          width: "112px",
          height: "20px",
          background: "#7777",
          borderRadius: "4px",
        }}
        src="https://pkg-size.dev/badge/bundle/11742"
        title="Bundle size for hwy"
      />
    </a>
  );
}

function Quickstart() {
  return (
    <H3Wrapper heading="Quickstart">
      <InlineCode
        high_contrast
        style={{
          alignSelf: "flex-start",
          fontSize: "1.25rem",
          fontWeight: "bold",
          fontStyle: "italic",
        }}
      >
        (npm, yarn, pnpm or bun) create hwy@latest
      </InlineCode>
    </H3Wrapper>
  );
}

function Acknowledgements() {
  return (
    <H3Wrapper heading="Acknowledgements">
      <div class="flex-col-wrapper">
        <Paragraph>
          Hwy is heavily inspired by{" "}
          <Link href="https://remix.run" target="_blank">
            Remix
          </Link>
          's patterns and wouldn't exist without their contributions to the web
          ecosystem.
        </Paragraph>
        <Paragraph>
          If you prefer a React-based approach to a HTMX-focused approach, or
          expect little to no bugs or issues to arise, then please use Remix
          over Hwy. Remix is extremely mature and a top choice for a production
          application today.
        </Paragraph>
      </div>
    </H3Wrapper>
  );
}

function Features() {
  return (
    <H3Wrapper heading="Features">
      <div class="flex-col-wrapper">
        <Paragraph>
          Do you feel comfortable with file-based routing?
          <br />
          If so, you'll feel right at home with Hwy!
        </Paragraph>
        <Paragraph>
          Do you enjoy having the flexibility of breaking up your boundaries
          however you choose to?
          <br />
          If so, you'll love working with Hwy!
        </Paragraph>
        <Paragraph>
          Do you love Remix's ideas and DX, but want to take advantage of HTMX's
          server-first approach?
          <br />
          If so, you'll want to start shipping with Hwy!
        </Paragraph>
        <Paragraph>
          Hwy relies on Hono on the backend, opening up endless possibilities
          with a fast-growing ecosystem of plugins.
        </Paragraph>
        <Paragraph>
          Hwy cares about supplying the surface for a performant application,
          whilst also supplying incredible DX to you, the developer!
        </Paragraph>
        <Paragraph>
          Hwy adheres to HTML standards and syntax using Hono's custom JSX
          implementation. Hwy applications are 100% server-rendered, whilst
          maintaining a SPA-type feel!
        </Paragraph>
        <Paragraph>
          Hwy remains familiar to Remix developers with Remix-style action and
          loader functions that run in parallel in nested route scenarios.
        </Paragraph>
        <Paragraph>
          If you prefer a RSC-esque model, you can opt into Hono's experimental
          HTML streaming feature to leverage the ability to asynchronously fetch
          data directly inside of your components.
        </Paragraph>
        <Paragraph>
          Hwy utilises HTMX's <InlineCode>hx-boost</InlineCode> attribute to
          enable progressive enhancement on forms and anchor tags.
        </Paragraph>
      </div>
    </H3Wrapper>
  );
}

function SimpleUsage() {
  return (
    <H3Wrapper heading="Simple usage">
      <div class="flex-col-wrapper">
        <Paragraph>
          You can fetch data using a Remix-style loader function:
        </Paragraph>
        <CodeBlock
          language="tsx"
          code={`
// src/pages/user/$user_id.page.tsx

import type { DataProps, PageProps } from 'hwy';
import { UserProfile, getUser } from './user-utils.js';

export async function loader({ params }: DataProps) {
  return { user: await getUser(params.user_id) };
}

function UserPage({ loaderData }: PageProps<typeof loader>) {
  return <UserProfile user={loaderData.user} />;
}

export default UserPage;
`}
        />

        <Paragraph>Or an RSC-esque approach:</Paragraph>

        <CodeBlock
          language="tsx"
          code={`
async function UserPage({ params }: PageProps) {
  const user = await getUser(params.user_id);
  return <UserProfile user={user} />;
}

export default UserPage;
`}
        />
      </div>
    </H3Wrapper>
  );
}

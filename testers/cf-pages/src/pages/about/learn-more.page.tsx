import { renderToReadableStream, Suspense } from "hono/jsx/streaming";

export default async function () {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return (
    <>
      <p>
        This is a nested route! It is coming from{" "}
        <code>src/pages/about/learn-more.page.tsx</code>.
      </p>

      <a href="/about" hx-boost="false">
        Back to index route
      </a>

      <Suspense fallback={<div>loading...</div>}>
        <Bob />
      </Suspense>
    </>
  );
}

async function Bob() {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return <div>Hi</div>;
}

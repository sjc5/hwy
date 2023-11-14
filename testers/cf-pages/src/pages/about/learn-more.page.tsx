export default async function () {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return (
    <>
      <p>
        This is a nested route! It is coming from{" "}
        <code>src/pages/about/learn-more.page.tsx</code>.
      </p>

      <a href="/about">Back to index route</a>

      <Bob />
    </>
  );
}

async function Bob() {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return <div>Hi</div>;
}

import { PageProps } from "hwy";

async function TesterComp({ outlet, params, splatSegments }: PageProps) {
  let pathname = new URL(import.meta.url).pathname;
  pathname = pathname.split("/dist/pages")[1];
  const is_splat = pathname.endsWith("$.js");

  return (
    <div class="tester-comp-wrapper">
      <p>Pathname: {pathname}</p>

      {is_splat && <p>SPLAT! {JSON.stringify(splatSegments)}</p>}

      {!is_splat && Object.keys(params).length ? (
        <p>Params: {JSON.stringify(params)}</p>
      ) : null}

      <div class="outlet-wrapper">{await outlet()}</div>
    </div>
  );
}

export { TesterComp };

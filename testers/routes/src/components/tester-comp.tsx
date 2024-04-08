import { PageProps } from "hwy";
import { useMemo, useState } from "react";

function TesterComp({ Outlet, params, splatSegments }: PageProps) {
  const [randomColor] = useState(
    "#" + Math.floor(Math.random() * 16777215).toString(16),
  );

  return (
    <div
      className="outlet-wrapper"
      style={{
        background: randomColor,
      }}
    >
      <div className="tester-comp-wrapper">
        <p>Splat Segments:{JSON.stringify(splatSegments)}</p>

        {Object.keys(params).length ? (
          <p>params: {JSON.stringify(params)}</p>
        ) : null}

        <Outlet />
      </div>
    </div>
  );
}

export { TesterComp };

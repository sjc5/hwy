import { useState } from "preact/hooks";

const IS_SERVER = typeof document === "undefined";

export function TestClientApp({ data }: { data: any }) {
  const [bob, set_bob] = useState(1);

  const [background_color, set_background_color] = useState("red");

  return (
    <div style={{ background: background_color }}>
      <div key="1">Bob</div>
      <div key="2">Bob</div>

      <div>IS_SERVER: {JSON.stringify(data)}</div>

      <div>TestClientApp</div>

      <div>{bob}</div>

      <button
        onClick={() => {
          set_bob(bob + 1);
          set_background_color(
            // random
            "#" + Math.floor(Math.random() * 16777215).toString(16),
          );
        }}
      >
        {bob}
      </button>
    </div>
  );
}

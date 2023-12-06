import { useState } from "preact/hooks";

const IS_SERVER = typeof document === "undefined";

export function TestClientApp() {
  const [bob, set_bob] = useState(1);

  return (
    <div>
      <div>IS_SERVER: {JSON.stringify(IS_SERVER)}</div>
      <div>TestClientApp</div>
      <div>{bob}</div>
      <button onClick={() => set_bob(bob + 1)}>{bob}</button>
    </div>
  );
}

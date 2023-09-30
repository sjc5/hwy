import { getPublicUrl } from "../utils/hashed-public-url.js";

function ClientEntryScript({
  strategy = "defer",
}: {
  strategy?: "defer" | "async";
}) {
  return (
    <script
      src={getPublicUrl("dist/client.entry.js")}
      {...{ [strategy]: true }}
    />
  );
}

export { ClientEntryScript };

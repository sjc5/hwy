import type { PageProps } from "hwy";

export default async function ({ outlet }: PageProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <p>
        This is the about page. This is coming from{" "}
        <code>src/pages/about.page.tsx</code> This is functioning as a "layout
        route" because it is rendering an "outlet" (see below).
      </p>

      <div style={{ textTransform: "uppercase", fontWeight: "bold" }}>
        Outlet:
      </div>

      <div class="outlet-wrapper">{await outlet()}</div>
    </div>
  );
}

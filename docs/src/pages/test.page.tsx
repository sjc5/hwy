import { PageProps } from "hwy";

export default function ({ Outlet }: PageProps) {
  return (
    <div>
      Test
      <Outlet />
    </div>
  );
}

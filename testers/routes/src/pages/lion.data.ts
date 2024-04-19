import { HeadProps } from "hwy";

export function head(props: HeadProps<typeof loader>) {
  console.log(props.loaderData.data.lion);
  return { title: "Lion" };
}

export const loader = async () => {
  if (Math.random() < 0.5) {
    throw new Response("", {
      status: 302,
      headers: { location: "/bob" },
    });
  }
  return { data: { lion: "🦁" } };
};

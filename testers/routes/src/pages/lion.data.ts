import { DataProps, HeadProps } from "hwy";

export function head(props: HeadProps<typeof loader>) {
  console.log(props.loaderData.data.lion);
  return { title: "Lion" };
}

export const loader = async (props: DataProps) => {
  // throw new Response("", {
  //   status: 302,
  //   headers: { location: "/bob" },
  // });
  const headers = new Headers();
  headers.set("x-lion", "asdf");
  props.responseInit.headers = headers;
  return { data: { lion: "🦁" } };
};

import { PageProps } from "hwy";
// import { useEffect } from "preact/hooks";
import { asdf } from "./bob";

export default function ({ loaderData }: PageProps) {
  // useEffect(() => {
  //   console.log("Hi from Bob useEffect", asdf, loaderData);
  // }, []);
  return (
    <div>
      Bob
      <div>
        <BobChild />
      </div>
    </div>
  );
}

function BobChild() {
  return <div>BobChild</div>;
}

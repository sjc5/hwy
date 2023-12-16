import { PageProps } from "hwy";
import { useEffect } from "preact/hooks";
import { asdf } from "./bob.js";

export default function ({ loaderData }: PageProps) {
  useEffect(() => {
    console.log("Hi from Bob useEffect", asdf, loaderData);
  }, []);

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
  // console.log(await hi());
  return <div>Jeff</div>;
}

// async function hi() {
//   await new Promise((resolve) => {
//     setTimeout(resolve, 1000);
//   });
//   return "larry";
// }

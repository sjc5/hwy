const IS_SERVER = typeof document === "undefined";

console.log("IS_SERVER", IS_SERVER);

if (IS_SERVER) {
  throw new Error("This file should not be imported on the server");
}

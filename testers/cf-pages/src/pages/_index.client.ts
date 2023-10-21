/// <reference lib="dom" />

const el = document.getElementById("button");

let count = 0;

function increment() {
  if (el) {
    count++;
    el.innerHTML = count.toString();
  }
}

const bob = "hi1";

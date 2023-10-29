/// <reference lib="dom" />

const el = document.getElementById("increment-button");

if (el) {
  let count = 0;

  el.addEventListener("click", () => {
    count++;
    el.innerHTML = count.toString();
  });
}

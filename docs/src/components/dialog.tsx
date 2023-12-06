import type { ChildrenPermissive } from "../types.js";

function DialogModal({
  open_button_inner,
  dialog_inner,
  wrapper_class,
  open_button_class,
}: {
  open_button_inner: ChildrenPermissive;
  dialog_inner: ChildrenPermissive;
  wrapper_class?: string;
  open_button_class?: string;
}) {
  return (
    <div hx-boost="false" class={wrapper_class}>
      <button
        // @ts-ignore
        onclick={`this.nextElementSibling.showModal()`}
        class={open_button_class}
      >
        {open_button_inner}
      </button>

      {/* @ts-ignore */}
      <dialog onclick="event.target==this && this.close()" class="dialog-reset">
        <form method="dialog">{dialog_inner}</form>
      </dialog>
    </div>
  );
}

export { DialogModal };

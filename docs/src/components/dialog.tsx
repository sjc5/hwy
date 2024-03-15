function DialogModal({
  open_button_inner,
  dialog_inner,
  wrapper_class,
  open_button_class,
}: {
  open_button_inner: any;
  dialog_inner: any;
  wrapper_class?: string;
  open_button_class?: string;
}) {
  return (
    <div className={wrapper_class}>
      <button
        // @ts-ignore
        onclick={`this.nextElementSibling.showModal()`}
        className={open_button_class}
      >
        {open_button_inner}
      </button>

      <dialog
        // @ts-ignore
        onclick="event.target==this && this.close()"
        className="dialog-reset"
      >
        <form method="dialog">{dialog_inner}</form>
      </dialog>
    </div>
  );
}

export { DialogModal };

function DialogModal({
  openButtonInner,
  dialogInner,
  wrapperClassName,
  openButtonClassName,
}: {
  openButtonInner: any;
  dialogInner: any;
  wrapperClassName?: string;
  openButtonClassName?: string;
}) {
  return (
    <div className={wrapperClassName}>
      <button
        // @ts-ignore
        onclick={`this.nextElementSibling.showModal()`}
        className={openButtonClassName}
      >
        {openButtonInner}
      </button>

      <dialog
        // @ts-ignore
        onclick="event.target==this && this.close()"
        className="dialog-reset"
      >
        <form method="dialog">{dialogInner}</form>
      </dialog>
    </div>
  );
}

export { DialogModal };

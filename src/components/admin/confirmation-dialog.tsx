"use client";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isProcessing = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,20,15,0.52)] px-4">
      <div className="w-full max-w-[520px] rounded-[1.5rem] border border-[#e4d5c7] bg-[#fffdfa] p-6 shadow-[0_28px_70px_rgba(40,28,18,0.28)]">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b46916]">Confirmation</div>
          <h3 className="mt-3 text-2xl font-semibold text-[#2f241c]">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-[#65584a]">{description}</p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary px-4 py-2.5" onClick={onCancel} disabled={isProcessing}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-danger px-4 py-2.5" onClick={onConfirm} disabled={isProcessing}>
            {isProcessing ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

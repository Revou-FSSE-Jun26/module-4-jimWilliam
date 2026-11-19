"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export interface BaseModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Below 768 px, show as a full-height sheet sliding up (CardDetailModal). */
  sheet?: boolean;
  wide?: boolean;
}

/**
 * Native <dialog> opened with showModal() (R20.3). The browser provides the inert page, focus
 * containment, Escape (R16.6) and focus return, so there is no role="dialog", aria-modal, focus
 * trap or Escape handler here. closedby="any" adds click-outside where supported.
 */
export function BaseModal({ open, title, onClose, children, sheet = false, wide = false }: BaseModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs at mount, before showModal(); focus the intended field now instead,
      // otherwise the browser lands on the close button (dialog guide: autofocus the first field).
      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ??
        dialog.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select");
      target?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Native close (Escape, back gesture, closedby light dismiss) keeps React state in sync.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    // Fallback light dismiss where closedby is unsupported.
    const supportsClosedBy = "closedBy" in HTMLDialogElement.prototype;
    const handleClick = (event: MouseEvent) => {
      if (supportsClosedBy || event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const outside = event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
      if (outside) dialog.close();
    };
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      {...{ closedby: "any" }}
      className={`base-modal glass-raised ${sheet ? "sheet" : ""} ${wide ? "md:w-[min(48rem,calc(100vw-2rem))]" : ""}`}
    >
      {/* Content stays mounted so the closing animation still shows it; a closed dialog is display: none. */}
      {(
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-center gap-3 px-5 pt-5 pb-3 md:px-6">
            <h2 id={titleId} className="text-xl leading-tight">{title}</h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={`Close ${title}`}
              className="ms-auto inline-flex size-10 items-center justify-center rounded-pill text-foam hover:bg-hover"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div className="overflow-y-auto px-5 pb-5 md:px-6 md:pb-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}

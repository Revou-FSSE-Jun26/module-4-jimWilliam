"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { ProtectedImage } from "@/components/shared/ProtectedImage";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

/**
 * Full-size view of an avatar or attachment (R41.5, R42.5). A native <dialog> rendered into <body>
 * through a portal, so it can open on top of the card modal without nesting dialogs or glass layers.
 * Escape, the close button or a click on the dark backdrop closes it.
 */
export function ImageLightbox({ image, onClose }: { image: LightboxImage | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (image && !dialog.open) dialog.showModal();
    if (!image && dialog.open) dialog.close();
  }, [image]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    const handleClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();   // the backdrop area around the figure
    };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog ref={ref} aria-label={image ? `Image: ${image.alt}` : "Image"} className="lightbox">
      {image && (
        <figure className="grid max-h-full justify-items-center gap-3">
          <ProtectedImage
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading="eager"
            className="max-h-[calc(100dvh-8rem)] max-w-full rounded-pebble"
            imgClassName="max-h-[calc(100dvh-8rem)] w-auto max-w-full rounded-pebble object-contain"
          />
          {image.caption && <figcaption className="text-sm text-[#E8F4F1]">{image.caption}</figcaption>}
        </figure>
      )}
      <button
        type="button"
        autoFocus
        onClick={() => ref.current?.close()}
        aria-label="Close image"
        className="lightbox-close"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </dialog>,
    document.body,
  );
}

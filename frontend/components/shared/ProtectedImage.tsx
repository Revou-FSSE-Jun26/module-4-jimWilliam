"use client";

import type { CSSProperties, MouseEvent, SyntheticEvent } from "react";

import { mediaUrl } from "@/lib/apiClient";

const block = (event: SyntheticEvent | MouseEvent) => event.preventDefault();

export interface ProtectedImageProps {
  /** Signed path from the API (/api/media/...) or an absolute URL. */
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
  /** Called when the image fails, e.g. a signed URL that expired while the page stayed open. */
  onError?: () => void;
}

/**
 * An image that discourages saving (R43.4): no context menu, no drag-out, no long-press callout,
 * no selection. A transparent shield sits on top so the browser never sees a right-click "on an image",
 * even if the contextmenu handler is skipped. This is a deterrent, not DRM: screenshots and developer
 * tools still work, which is why the files themselves sit behind short-lived signed URLs.
 */
export function ProtectedImage({ src, alt, className = "", imgClassName = "", width, height, style, loading = "lazy", onError }: ProtectedImageProps) {
  const url = mediaUrl(src) ?? "";
  return (
    <span className={`protected-media ${className}`} onContextMenu={block} onDragStart={block} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived API URLs; next/image would re-host them */}
      <img
        src={url}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        draggable={false}
        referrerPolicy="no-referrer"
        className={imgClassName}
        onError={onError}
      />
      <span aria-hidden="true" className="protected-shield" />
    </span>
  );
}

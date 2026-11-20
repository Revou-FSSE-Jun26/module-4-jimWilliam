"use client";

import { useState } from "react";

import { ProtectedImage } from "@/components/shared/ProtectedImage";
import { avatarHue, initials } from "@/lib/avatar";

const SIZES = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-11 text-base", xl: "size-24 text-3xl" } as const;

/**
 * The user's AVIF photo when they have one (R41), otherwise initials on a hue derived from the user
 * id, so the same person looks the same everywhere (R36.7). Decorative: the name is always shown or
 * announced next to it.
 */
export function Avatar({ id, name, src, size = "md", ring = false }: {
  id: string;
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  ring?: boolean;
}) {
  const hue = avatarHue(id);
  // A failed image (an expired link on a page left open for hours) falls back to initials.
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = !!src && failed !== src;
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill font-semibold text-avatar-ink ${SIZES[size]} ${ring ? "ring-4 ring-[color-mix(in_srgb,var(--seaglass)_45%,transparent)]" : ""}`}
      style={{ background: `hsl(${hue} 45% 72%)`, backgroundColor: `oklch(0.78 0.09 ${hue})` }}
    >
      {showPhoto ? (
        <ProtectedImage src={src} alt="" className="absolute inset-0" imgClassName="size-full object-cover" onError={() => setFailed(src)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

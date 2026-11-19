import { avatarHue, initials } from "@/lib/avatar";

const SIZES = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-11 text-base", xl: "size-24 text-3xl" } as const;

/** Initials on a hue derived from the user id: the same person looks the same everywhere (R36.7). */
export function Avatar({ id, name, size = "md", ring = false }: { id: string; name: string; size?: keyof typeof SIZES; ring?: boolean }) {
  const hue = avatarHue(id);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-pill font-semibold text-avatar-ink ${SIZES[size]} ${ring ? "ring-4 ring-[color-mix(in_srgb,var(--seaglass)_45%,transparent)]" : ""}`}
      style={{ background: `hsl(${hue} 45% 72%)`, backgroundColor: `oklch(0.78 0.09 ${hue})` }}
    >
      {initials(name)}
    </span>
  );
}

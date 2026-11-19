import type { HTMLAttributes } from "react";

export type BadgeColor = "neutral" | "info" | "success" | "warning" | "danger";

const COLORS: Record<BadgeColor, string> = {
  neutral: "bg-[color-mix(in_srgb,var(--foam)_12%,transparent)] text-foam",
  info: "bg-[color-mix(in_srgb,var(--seaglass)_22%,transparent)] text-foam ring-1 ring-inset ring-[color-mix(in_srgb,var(--seaglass)_55%,transparent)]",
  success: "bg-seaglass text-on-seaglass",
  warning: "bg-buoy text-on-buoy",
  danger: "bg-danger text-on-danger",
};

export interface BaseBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
}

/** Short text label with color variants (R20.2). */
export function BaseBadge({ color = "neutral", className = "", children, ...rest }: BaseBadgeProps) {
  return (
    <span
      data-color={color}
      className={`inline-flex items-center justify-center rounded-pill px-2 min-w-6 h-6 text-[0.8125rem] font-medium tabular-nums leading-none ${COLORS[color]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

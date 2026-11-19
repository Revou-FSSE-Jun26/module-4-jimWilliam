import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md";

export interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-seaglass text-on-seaglass font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]",
  secondary: "glass-pebble text-foam font-medium",
  destructive: "bg-danger text-on-danger font-semibold",
  ghost: "text-foam font-medium hover:bg-hover",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5",
  md: "min-h-11 px-4 text-[0.9375rem] gap-2",
};

/**
 * The only button used on pages (R20.6). Variants primary, secondary and destructive (R20.1);
 * a disabled button ignores clicks (R20.4).
 */
export const BaseButton = forwardRef<HTMLButtonElement, BaseButtonProps>(function BaseButton(
  { variant = "primary", size = "md", loading = false, loadingLabel, icon, disabled, className = "", children, type = "button", ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-variant={variant}
      className={[
        "lift relative inline-flex items-center justify-center rounded-pill whitespace-nowrap select-none",
        "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {icon && <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span>}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
});

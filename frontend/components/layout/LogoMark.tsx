import { useId } from "react";

/**
 * The RevoTask mark (the same artwork as docs/assets/logo.svg and app/icon.svg): three tumbled
 * sea-glass pebbles for To do, Doing and Done on a deep-water tile. Gradient ids come from useId,
 * because the mark appears more than once on a page (sidebar and drawer). Decorative: the brand
 * name is always next to it.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, "");
  return (
    <svg viewBox="0 0 120 120" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C9EDE4" />
          <stop offset="0.55" stopColor="#9FD8CB" />
          <stop offset="1" stopColor="#4E9C94" />
        </linearGradient>
        <linearGradient id={`${id}-deep`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1F5C63" />
          <stop offset="1" stopColor="#0E2A33" />
        </linearGradient>
        <radialGradient id={`${id}-sheen`} cx="0.28" cy="0.22" r="0.55">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="112" height="112" rx="30" fill={`url(#${id}-deep)`} />
      <path d="M24 34c0-6 5-10 11-10h11c6 0 10 5 10 11v6c0 6-5 10-11 10H34c-6 0-10-5-10-11z" fill="#9FD8CB" opacity="0.35" />
      <path d="M24 66c0-6 5-10 11-10h11c6 0 10 5 10 11v4c0 6-5 10-11 10H34c-6 0-10-5-10-11z" fill="#9FD8CB" opacity="0.2" />
      <path d="M62 30c1-5 6-8 12-8l11 1c7 1 12 6 12 13l-1 44c0 9-7 16-16 16H75c-8 0-14-7-14-15z" fill={`url(#${id}-glass)`} />
      <path d="M62 30c1-5 6-8 12-8l11 1c7 1 12 6 12 13l-1 44c0 9-7 16-16 16H75c-8 0-14-7-14-15z" fill={`url(#${id}-sheen)`} />
      <path d="M70 58l7 7 12-14" fill="none" stroke="#0E2A33" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

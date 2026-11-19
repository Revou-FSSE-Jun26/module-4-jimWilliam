import { Figtree, Fraunces } from "next/font/google";

/** Headings: Fraunces with the SOFT axis for rounded, tumbled-glass terminals (R34.9). */
export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

/** Interface text: Figtree stays legible at small sizes on translucent fills. */
export const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

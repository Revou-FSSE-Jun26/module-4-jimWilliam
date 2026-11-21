import { avatarHue } from "@/lib/avatar";

/**
 * Board colours (R48): eight hues spaced around the OKLCH wheel, named after the sea-glass theme.
 * The same lightness and chroma are used everywhere (dot, progress liquid, tile accent), so any
 * choice keeps the same contrast. A board without a choice gets a hue derived from its id.
 */
export const BOARD_COLORS = [
  { name: "Coral", hue: 30 },
  { name: "Amber", hue: 75 },
  { name: "Kelp", hue: 140 },
  { name: "Sea glass", hue: 175 },
  { name: "Lagoon", hue: 215 },
  { name: "Deep water", hue: 255 },
  { name: "Violet", hue: 300 },
  { name: "Rose", hue: 350 },
] as const;

export function boardHue(board: { id: string; color_hue?: number | null }): number {
  return board.color_hue ?? avatarHue(board.id);
}

export function colorName(hue: number | null | undefined): string {
  if (hue === null || hue === undefined) return "Automatic";
  return BOARD_COLORS.find((c) => c.hue === hue)?.name ?? `Hue ${hue}`;
}

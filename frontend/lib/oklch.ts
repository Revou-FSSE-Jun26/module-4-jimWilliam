/**
 * Colour picking for boards (R48.4). A board colour is only a hue: lightness 0.74 and chroma 0.11
 * are fixed so every colour keeps the same contrast. Any colour the user picks is reduced to its
 * OKLCH hue, and the picker shows the colour that hue will really produce.
 */
export const BOARD_L = 0.74;
export const BOARD_C = 0.11;

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** "#RRGGBB" -> OKLCH hue in [0, 360), or null for greys (no hue) and invalid input. */
export function hueFromHex(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  if (Math.hypot(A, B) < 0.02) return null;
  const hue = (Math.atan2(B, A) * 180) / Math.PI;
  return (hue + 360) % 360;
}

/** The board colour for a hue as "#RRGGBB" (for the native colour input and previews). */
export function hexFromHue(hue: number, L = BOARD_L, C = BOARD_C): string {
  const h = (hue * Math.PI) / 180;
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255).toString(16).padStart(2, "0")).join("")}`;
}

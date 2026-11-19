/**
 * Property 37: Design tokens meet contrast targets (R34.6, R39.4), checked on every glass surface,
 * translucent and opaque, over the lightest App_Background point, in both themes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { TOKENS, type ThemeName, type ThemeTokens } from "@/lib/tokens";

type RGB = [number, number, number];

function hex(h: string): RGB {
  const v = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as RGB;
}

function over([r, g, b, a]: [number, number, number, number], base: RGB): RGB {
  return [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)];
}

function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function surfaces(t: ThemeTokens): Record<string, RGB> {
  const bg = hex(t.backgroundLightest);
  const pane = over(t.paneFill, bg);
  return {
    "pane (translucent)": pane,
    "raised (translucent)": over(t.raisedFill, bg),
    "pebble on pane (translucent)": over(t.pebbleFill, pane),
    "pane (opaque)": hex(t.paneSolid),
    "raised (opaque)": hex(t.raisedSolid),
    "pebble (opaque)": hex(t.pebbleSolid),
  };
}

const THEMES: ThemeName[] = ["dark", "light"];

describe.each(THEMES)("%s theme", (theme) => {
  const t = TOKENS[theme];
  const cases = Object.entries(surfaces(t));

  it.each(cases)("body and muted text reach 4.5:1 on %s", (_name, surface) => {
    expect(contrast(hex(t.foam), surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(t.muted), surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(t.dangerText), surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(cases)("focus ring and accent reach 3:1 on %s", (_name, surface) => {
    expect(contrast(hex(t.ring), surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(hex(t.seaglass), surface)).toBeGreaterThanOrEqual(3);
  });

  it("text on filled buttons and badges reaches 4.5:1", () => {
    expect(contrast(hex(t.onSeaglass), hex(t.seaglass))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(t.onDanger), hex(t.dangerFill))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(t.onBuoy), hex(t.buoy))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("globals.css stays in sync with lib/tokens.ts", () => {
  const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");
  const blockFor = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    return css.slice(start, css.indexOf("}", start));
  };
  const VARS: Record<string, keyof ThemeTokens> = {
    "--abyss": "abyss", "--seaglass": "seaglass", "--on-seaglass": "onSeaglass", "--foam": "foam", "--muted": "muted",
    "--buoy": "buoy", "--on-buoy": "onBuoy", "--danger-fill": "dangerFill", "--danger-text": "dangerText", "--ring": "ring",
    "--pane-solid": "paneSolid", "--raised-solid": "raisedSolid", "--pebble-solid": "pebbleSolid",
  };

  it.each([
    ["dark", ":root"],
    ["light", ':root[data-theme="light"]'],
  ] as const)("%s values match", (theme, selector) => {
    const block = blockFor(selector);
    for (const [cssVar, key] of Object.entries(VARS)) {
      expect(block).toMatch(new RegExp(`${cssVar}:\\s*${(TOKENS[theme][key] as string).replace("#", "#")};`, "i"));
    }
  });
});

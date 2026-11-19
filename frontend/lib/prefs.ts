/** Appearance_Preferences stored in the `revotask_prefs` cookie (R36.5, R36.6). */
export type Theme = "system" | "light" | "dark";

export interface Prefs {
  theme: Theme;
  animateBg: boolean;
  reduceTransparency: boolean;
}

export const PREFS_COOKIE = "revotask_prefs";
export const DEFAULT_PREFS: Prefs = { theme: "system", animateBg: false, reduceTransparency: false };

const THEMES: readonly Theme[] = ["system", "light", "dark"];

/** Format: "theme.animateBg.reduceTransparency", e.g. "dark.1.0". Short, URL-safe, no JSON in cookies. */
export function serializePrefs(prefs: Prefs): string {
  return `${prefs.theme}.${prefs.animateBg ? 1 : 0}.${prefs.reduceTransparency ? 1 : 0}`;
}

/** Never throws: each invalid part falls back to its default. */
export function parsePrefs(value: string | undefined | null): Prefs {
  const [theme, animate, reduce] = (typeof value === "string" ? value : "").split(".");
  return {
    theme: (THEMES as readonly string[]).includes(theme) ? (theme as Theme) : DEFAULT_PREFS.theme,
    animateBg: animate === "1" ? true : animate === "0" ? false : DEFAULT_PREFS.animateBg,
    reduceTransparency: reduce === "1" ? true : reduce === "0" ? false : DEFAULT_PREFS.reduceTransparency,
  };
}

/** Attributes rendered on <html> so the first paint already uses the chosen look. */
export function htmlAttributes(prefs: Prefs) {
  return {
    "data-theme": prefs.theme,
    "data-glass": prefs.reduceTransparency ? "reduced" : "full",
    "data-bg-motion": prefs.animateBg ? "on" : "off",
  } as const;
}

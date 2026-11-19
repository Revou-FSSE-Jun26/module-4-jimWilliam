/**
 * Color Design_Tokens (R34.1). `app/globals.css` declares the same values as CSS variables;
 * `__tests__/tokens.test.ts` checks that both stay in sync and that every pair meets contrast (Property 37).
 */
export type ThemeName = "dark" | "light";

export interface ThemeTokens {
  abyss: string;        // App_Background base
  abyssDeep: string;    // App_Background bottom
  tide: string;
  seaglass: string;     // primary fill, links, current-page rim
  onSeaglass: string;   // text on a primary fill
  foam: string;         // body text, icons
  muted: string;        // secondary text
  buoy: string;         // accent: unread, unsaved
  onBuoy: string;
  dangerFill: string;   // destructive buttons
  onDanger: string;
  dangerText: string;   // error messages on glass
  ring: string;         // focus ring
  paneSolid: string;    // opaque fallbacks (R34.5, R39.1)
  raisedSolid: string;
  pebbleSolid: string;
  /** Translucent fills as [r, g, b, alpha] so the test can composite them. */
  paneFill: [number, number, number, number];
  raisedFill: [number, number, number, number];
  pebbleFill: [number, number, number, number];
  /** The lightest point the App_Background reaches, for worst-case contrast. */
  backgroundLightest: string;
}

export const TOKENS: Record<ThemeName, ThemeTokens> = {
  dark: {
    abyss: "#0E2A33",
    abyssDeep: "#081B21",
    tide: "#1F5C63",
    seaglass: "#9FD8CB",
    onSeaglass: "#0E2A33",
    foam: "#EEF6F2",
    muted: "#C7DED8",
    buoy: "#F2B33D",
    onBuoy: "#0E2A33",
    dangerFill: "#B42840",
    onDanger: "#FFFFFF",
    dangerText: "#FFC2CA",
    ring: "#EEF6F2",
    paneSolid: "#163A44",
    raisedSolid: "#1A434E",
    pebbleSolid: "#1E4B55",
    paneFill: [14, 42, 51, 0.6],
    raisedFill: [14, 42, 51, 0.72],
    pebbleFill: [159, 216, 203, 0.12],
    // Sea-glass light pool (alpha .30) over the tide layer: the brightest the dark background gets.
    backgroundLightest: "#458182",
  },
  light: {
    abyss: "#DCEFEA",
    abyssDeep: "#C4E2DC",
    tide: "#A9D6CF",
    seaglass: "#236B63",
    onSeaglass: "#FFFFFF",
    foam: "#0E2A33",
    muted: "#36565C",
    buoy: "#9A6400",
    onBuoy: "#FFFFFF",
    dangerFill: "#B42840",
    onDanger: "#FFFFFF",
    dangerText: "#A3203A",
    ring: "#0E2A33",
    paneSolid: "#F2F8F6",
    raisedSolid: "#FFFFFF",
    pebbleSolid: "#FFFFFF",
    paneFill: [255, 255, 255, 0.55],
    raisedFill: [255, 255, 255, 0.74],
    pebbleFill: [255, 255, 255, 0.7],
    backgroundLightest: "#FFFFFF",
  },
};

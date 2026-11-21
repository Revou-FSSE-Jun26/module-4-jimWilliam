/**
 * The Tide_Clock (R45). Time of day drives a "tide": the sidebar's waves rise towards a high tide at
 * 15:00 and ebb to a low tide at 03:00, so the interface quietly shows how far the day has run.
 */
export const HIGH_TIDE_HOUR = 15;

function hoursOf(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/** 0 (low tide, 03:00) to 1 (high tide, 15:00), a smooth cosine over 24 hours. */
export function tideLevel(date: Date): number {
  const radians = ((hoursOf(date) - HIGH_TIDE_HOUR) / 24) * 2 * Math.PI;
  return Math.min(1, Math.max(0, 0.5 + 0.5 * Math.cos(radians)));
}

/** Rising from low tide (03:00) to high tide (15:00), falling otherwise. */
export function tideTrend(date: Date): "rising" | "falling" {
  const h = hoursOf(date);
  return h >= HIGH_TIDE_HOUR - 12 && h < HIGH_TIDE_HOUR ? "rising" : "falling";
}

export function dayPart(date: Date): "Morning" | "Afternoon" | "Evening" | "Night" {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 22) return "Evening";
  return "Night";
}

export interface ClockParts {
  hours: string;
  minutes: string;
  suffix: "AM" | "PM" | null;
}

export function clockParts(date: Date, hour12: boolean): ClockParts {
  const h = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  if (!hour12) return { hours: String(h).padStart(2, "0"), minutes, suffix: null };
  return { hours: String(h % 12 === 0 ? 12 : h % 12), minutes, suffix: h < 12 ? "AM" : "PM" };
}

/** "Sat 21 Nov" in the user's locale order, English names (the UI language). */
export function shortDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function longDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

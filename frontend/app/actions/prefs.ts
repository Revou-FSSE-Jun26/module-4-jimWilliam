"use server";

import { cookies } from "next/headers";

import { PREFS_COOKIE, parsePrefs, serializePrefs, type Prefs } from "@/lib/prefs";

/** Persists Appearance_Preferences for a year; parsing first means only valid values are stored. */
export async function setPrefs(prefs: Prefs): Promise<void> {
  const clean = parsePrefs(serializePrefs(prefs));
  (await cookies()).set(PREFS_COOKIE, serializePrefs(clean), {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

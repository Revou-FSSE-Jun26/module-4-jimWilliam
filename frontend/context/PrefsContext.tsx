"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { setPrefs } from "@/app/actions/prefs";
import { htmlAttributes, type Prefs } from "@/lib/prefs";

interface PrefsContextValue {
  prefs: Prefs;
  update: (patch: Partial<Prefs>) => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

/** Applies Appearance_Preferences at once, then persists them in the cookie (R36.5). */
export function PrefsProvider({ initial, children }: { initial: Prefs; children: ReactNode }) {
  const [prefs, setState] = useState<Prefs>(initial);

  // Side effects stay outside the state updater, which React requires to be pure.
  const update = useCallback(
    (patch: Partial<Prefs>) => {
      const next = { ...prefs, ...patch };
      setState(next);
      const root = document.documentElement;
      for (const [name, value] of Object.entries(htmlAttributes(next))) root.setAttribute(name, value);
      void setPrefs(next).catch(() => undefined); // a failed save only loses persistence
    },
    [prefs],
  );

  const value = useMemo(() => ({ prefs, update }), [prefs, update]);
  return <PrefsContext value={value}>{children}</PrefsContext>;
}

export function usePrefsContext(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePreferences must be used inside PrefsProvider");
  return ctx;
}

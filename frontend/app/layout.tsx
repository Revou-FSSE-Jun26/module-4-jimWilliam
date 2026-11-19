import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Toaster } from "react-hot-toast";

import { AppBackground } from "@/components/layout/AppBackground";
import { AuthProvider } from "@/context/AuthContext";
import { PrefsProvider } from "@/context/PrefsContext";
import { PREFS_COOKIE, htmlAttributes, parsePrefs } from "@/lib/prefs";
import { SESSION_COOKIE, getSessionUser } from "@/lib/session";

import { figtree, fraunces } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RevoTask", template: "%s | RevoTask" },
  description: "Organise work into boards and columns, move cards as work progresses, and keep your team in sync.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0E2A33" },
    { media: "(prefers-color-scheme: light)", color: "#DCEFEA" },
  ],
};

/**
 * Reads the Session_Cookie and revotask_prefs on the server, so a reload keeps the user signed in
 * (R32.2, R32.3) and the first paint already has the chosen theme (R36.6).
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const prefs = parsePrefs(store.get(PREFS_COOKIE)?.value);
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const user = await getSessionUser(token);

  return (
    <html lang="en" {...htmlAttributes(prefs)} className={`${fraunces.variable} ${figtree.variable}`}>
      <body>
        <AppBackground />
        <AuthProvider initial={{ token: user ? token : null, user }}>
          <PrefsProvider initial={prefs}>{children}</PrefsProvider>
        </AuthProvider>
        <Toaster position="bottom-center" toastOptions={{ className: "toast-glass", duration: 4000 }} />
      </body>
    </html>
  );
}

import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { AuthProvider } from "@/context/AuthContext";
import { PrefsProvider } from "@/context/PrefsContext";
import { DEFAULT_PREFS } from "@/lib/prefs";
import type { User } from "@/lib/types";

export const ANA: User = { id: "11111111-1111-4111-8111-111111111111", name: "Ana Novak", email: "ana@example.com" };

export function renderWithProviders(ui: ReactElement, { user = ANA, token = "test-token", ...options }: { user?: User | null; token?: string | null } & RenderOptions = {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider initial={{ token, user }}>
        <PrefsProvider initial={DEFAULT_PREFS}>{children}</PrefsProvider>
      </AuthProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

/** jsdom here has no Response; apiClient only needs ok, status, statusText and json(). */
function jsonResponse(status: number, payload: unknown) {
  return { ok: status >= 200 && status < 300, status, statusText: String(status), json: async () => payload } as Response;
}

/** Mocks fetch with a router of `METHOD path` → JSON data (wrapped in the envelope). */
export function mockApi(routes: Record<string, unknown | ((body: unknown) => unknown)>) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^https?:\/\/[^/]+/, "");
    const method = (init?.method ?? "GET").toUpperCase();
    const raw = init?.body;
    const body = raw instanceof FormData ? raw : raw ? JSON.parse(String(raw)) : undefined;
    calls.push({ method, url, body });
    const key = Object.keys(routes).find((k) => k === `${method} ${url}` || k === `${method} ${url.split("?")[0]}`);
    if (!key) return jsonResponse(404, { error: "Not mocked" });
    const value = routes[key];
    const data = typeof value === "function" ? (value as (b: unknown) => unknown)(body) : value;
    return jsonResponse(200, { data });
  }) as jest.Mock;
  return calls;
}

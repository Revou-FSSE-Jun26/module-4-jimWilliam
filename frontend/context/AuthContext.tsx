"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { deleteSession } from "@/app/actions/session";
import type { User } from "@/lib/types";

interface AuthState {
  token: string | null;
  user: User | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the JWT and user in memory only (FE-04). The root layout seeds it from the HttpOnly
 * Session_Cookie, so a reload keeps the user signed in (R32.2, R32.3).
 */
export function AuthProvider({ initial, children }: { initial: AuthState; children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(initial);

  const login = useCallback((token: string, user: User) => setState({ token, user }), []);
  const setUser = useCallback((user: User) => setState((s) => ({ ...s, user })), []);
  const logout = useCallback(async () => {
    await deleteSession();
    setState({ token: null, user: null }); // stops useNotifications polling (R32.5)
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ ...state, login, logout, setUser }), [state, login, logout, setUser]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

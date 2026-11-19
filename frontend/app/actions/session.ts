"use server";

import { cookies } from "next/headers";

import { apiClient } from "@/lib/apiClient";
import { SESSION_COOKIE } from "@/lib/session";
import type { User } from "@/lib/types";

/**
 * Stores the JWT in an HttpOnly cookie so Server Components and the proxy can read it and the
 * session survives a reload (R32.1). The token is checked against the API before it is stored.
 */
export async function createSession(token: string, expiresAt: string): Promise<User> {
  const user = await apiClient<User>("/api/users/me", { token });
  const expires = new Date(expiresAt);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: Number.isNaN(expires.getTime()) ? undefined : expires,
  });
  return user;
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

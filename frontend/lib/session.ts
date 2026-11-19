import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { apiClient } from "@/lib/apiClient";
import { ApiError } from "@/lib/errors";
import type { User } from "@/lib/types";

export const SESSION_COOKIE = "revotask_token";

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Fetch for Server Components: a 401 sends the user through /session/clear to log in again. */
export async function serverFetch<T>(path: string): Promise<T> {
  const token = await getToken();
  try {
    return await apiClient<T>(path, { token });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) redirect("/session/clear");
    // 403 and 404 look the same, so the page never confirms that a private board exists.
    if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403)) notFound();
    throw err;
  }
}

export async function getSessionUser(token: string | null): Promise<User | null> {
  if (!token) return null;
  try {
    return await apiClient<User>("/api/users/me", { token });
  } catch {
    return null;
  }
}

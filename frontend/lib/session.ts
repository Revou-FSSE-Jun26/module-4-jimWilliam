import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { apiClient } from "@/lib/apiClient";
import { ApiError } from "@/lib/errors";
import type { User } from "@/lib/types";

export const SESSION_COOKIE = "revotask_token";

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/**
 * One API call per path per request: the dashboard's layout and page both need /api/boards, and
 * React's cache() makes the second one reuse the first. The cache lives only for the current server
 * request, so nothing is ever shared between users or kept between page loads.
 */
const fetchOnce = cache((path: string, token: string | null) => apiClient<unknown>(path, { token }));

/** Fetch for Server Components: a 401 sends the user through /session/clear to log in again. */
export async function serverFetch<T>(path: string): Promise<T> {
  const token = await getToken();
  try {
    return (await fetchOnce(path, token)) as T;
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) redirect("/session/clear");
    // 403 and 404 look the same, so the page never confirms that a private board exists.
    if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403)) notFound();
    throw err;
  }
}

export const getSessionUser = cache(async (token: string | null): Promise<User | null> => {
  if (!token) return null;
  try {
    return (await fetchOnce("/api/users/me", token)) as User;
  } catch {
    return null;
  }
});

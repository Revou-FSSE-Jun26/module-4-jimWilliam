import { ApiError } from "@/lib/errors";

type Json = Record<string, unknown> | unknown[];

export interface ApiOptions extends Omit<RequestInit, "body"> {
  token?: string | null;
  body?: Json;
}

/** Server Components use API_BASE_URL; the browser uses NEXT_PUBLIC_API_BASE_URL (R21.2, R21.3). */
function baseUrl(): string {
  const url = typeof window === "undefined" ? process.env.API_BASE_URL : process.env.NEXT_PUBLIC_API_BASE_URL;
  return (url ?? "").replace(/\/$/, "");
}

/** Typed fetch wrapper: adds the Bearer token, unwraps the envelope, throws ApiError on non-2xx (FE-02). */
export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, body, headers: extraHeaders, ...init } = options;
  const headers = new Headers(extraHeaders);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Can't reach RevoTask. Check your connection and try again.");
  }

  const payload: { data?: T; error?: string } = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, payload.error ?? res.statusText ?? "Request failed");
  return payload.data as T;
}

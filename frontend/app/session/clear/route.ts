import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

/**
 * Server Components cannot delete cookies. When the API rejects a stored token (for example the
 * account was removed), they redirect here so the cookie is cleared and the proxy does not bounce
 * the user between /login and / forever.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

import { NextResponse, type NextRequest } from "next/server";

import { isTokenValid } from "@/lib/jwt";

const SESSION_COOKIE = "revotask_token";
const AUTH_PAGES = ["/login", "/register"];

/**
 * Optimistic route guard (R12.6, R32.6). It only checks that the cookie holds an unexpired JWT;
 * the Flask API verifies the signature on every request, so this is never the only defence.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = isTokenValid(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!signedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (signedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, static files and the cookie-clearing route.
  matcher: ["/((?!_next/static|_next/image|session/clear|favicon.ico|.*\\.(?:png|svg|ico|webp|jpg|txt)$).*)"],
};

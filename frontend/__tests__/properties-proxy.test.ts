/**
 * @jest-environment node
 *
 * Feature: revotask, Property 26: Unauthenticated users are redirected (R12.6, R32.6).
 */
import fc from "fast-check";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

function jwt(exp: number | null): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256" })}.${enc(exp === null ? { sub: "x" } : { sub: "x", exp })}.signature`;
}

function request(path: string, cookie?: string) {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  if (cookie !== undefined) req.cookies.set("revotask_token", cookie);
  return req;
}

const PROTECTED = fc.constantFrom("/", "/my-tasks", "/profile", "/boards/abc", "/boards/123e4567-e89b-12d3-a456-426614174000");
const AUTH = fc.constantFrom("/login", "/register");
const now = () => Math.floor(Date.now() / 1000);

describe("Property 26: route guard", () => {
  it("redirects protected pages to /login without an unexpired cookie", () => {
    const badCookie = fc.oneof(
      fc.constant(undefined),
      fc.string({ maxLength: 40 }),
      fc.integer({ min: 1, max: 10 ** 6 }).map((ago) => jwt(now() - ago)),
      fc.constant(jwt(null)),
    );
    fc.assert(fc.property(PROTECTED, badCookie, (path, cookie) => {
      const res = proxy(request(path, cookie));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    }), { numRuns: 100 });
  });

  it("lets signed-in users through and sends them away from /login and /register", () => {
    fc.assert(fc.property(PROTECTED, AUTH, fc.integer({ min: 60, max: 10 ** 6 }), (path, authPath, ahead) => {
      const token = jwt(now() + ahead);
      expect(proxy(request(path, token)).headers.get("location")).toBeNull();
      const res = proxy(request(authPath, token));
      expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    }), { numRuns: 100 });
  });

  it("lets signed-out users open /login and /register", () => {
    fc.assert(fc.property(AUTH, (path) => {
      expect(proxy(request(path)).headers.get("location")).toBeNull();
    }), { numRuns: 20 });
  });
});

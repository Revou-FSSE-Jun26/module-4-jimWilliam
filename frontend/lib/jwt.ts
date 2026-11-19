/** Reads the `exp` claim without verifying the signature (Flask verifies it on every call). */
export function jwtExpiry(token: string | undefined | null): number | null {
  if (!token) return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string | undefined | null, nowSeconds = Date.now() / 1000): boolean {
  const exp = jwtExpiry(token);
  return exp !== null && exp > nowSeconds;
}

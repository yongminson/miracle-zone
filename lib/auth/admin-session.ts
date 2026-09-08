import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "myeongun_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function adminSecret(): string | null {
  return process.env.YONGMINCUCU_PASSWORD?.trim() || null;
}

function digest(value: string): Buffer {
  return createHmac("sha256", adminSecret() ?? "unconfigured-admin-session")
    .update(value)
    .digest();
}

export function verifyAdminPassword(input: string): boolean {
  const expected = adminSecret();
  if (!expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
}

export function createAdminSessionToken(now = Date.now()): string | null {
  if (!adminSecret()) return null;
  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  const payload = `v1.${expiresAt}`;
  const signature = digest(payload).toString("base64url");
  return `${payload}.${signature}`;
}

export function hasValidAdminSession(request: NextRequest, now = Date.now()): boolean {
  if (!adminSecret()) return false;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  const match = /^v1\.(\d+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;

  const expiresAt = Number(match[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;

  const expected = digest(`v1.${expiresAt}`);
  const supplied = Buffer.from(match[2], "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

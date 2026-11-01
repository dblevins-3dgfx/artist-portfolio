/*
 * Studio-desk session. The cookie holds the time it was issued and an HMAC
 * of that time, keyed by the password. It does not hold the password. The
 * server refuses a session older than SESSION_DAYS, so a copied cookie stops
 * working even if the browser keeps it. Changing STUDIO_PASSWORD ends every
 * session at once. Comparing digests with timingSafeEqual avoids a
 * byte-by-byte early exit.
 *
 * cookies() and headers() are request-scoped Next APIs. Calling them marks
 * the route dynamic. The failed-login map hangs off globalThis because a
 * module-level Map would look like one, but on Vercel each instance has its
 * own memory and cold starts wipe it. The limit is per process, not global.
 * The lockout rules themselves are in login-attempts.ts.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import {
  clearFailures,
  clientAddressFrom,
  isLockedOut,
  recordFailure,
  type Attempts,
} from "@/lib/login-attempts";

// Only the desk reads the session, so the browser sends it only to /curate.
// The name changed when the path did: a response can set one cookie per
// name, so a new name is how sign-in and sign-out can also clear the old
// site-wide cookie. Drop LEGACY_COOKIE once old sessions have expired.
const COOKIE = "studio_desk_session";
const COOKIE_PATH = "/curate";
const LEGACY_COOKIE = "studio_desk";
const SESSION_DAYS = 14;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
// Room for a server clock that runs slightly behind the one that signed.
const CLOCK_SKEW_MS = 60 * 1000;
const SESSION = /^v2\.(\d{1,15})\.([0-9a-f]{64})$/;

function attempts() {
  const globalState = globalThis as typeof globalThis & { __studioDeskAttempts?: Attempts };
  globalState.__studioDeskAttempts ??= new Map();
  return globalState.__studioDeskAttempts;
}

export function studioPassword() {
  const value = process.env.STUDIO_PASSWORD?.trim() ?? "";
  return value.length > 0 ? value : null;
}

function signingKey(password: string) {
  return createHash("sha256").update(`thomasene-studio-desk:${password}`).digest();
}

function sessionDigest(password: string, issuedAt: number) {
  return createHmac("sha256", signingKey(password)).update(`desk-session-v2.${issuedAt}`).digest("hex");
}

export function mintSession(password: string, issuedAt = Date.now()) {
  return `v2.${issuedAt}.${sessionDigest(password, issuedAt)}`;
}

export function sessionMatches(cookie: string, password: string, now = Date.now()) {
  const match = SESSION.exec(cookie);
  if (!match) return false;
  const issuedAt = Number(match[1]);
  if (issuedAt > now + CLOCK_SKEW_MS || now - issuedAt >= SESSION_MS) return false;
  const left = Buffer.from(match[2]);
  const right = Buffer.from(sessionDigest(password, issuedAt));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function passwordMatches(attempt: string, expected: string) {
  const left = createHash("sha256").update(attempt).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: COOKIE_PATH,
    maxAge,
  };
}

export async function clientAddress() {
  const headerList = await headers();
  return clientAddressFrom(headerList.get("x-forwarded-for"), headerList.get("x-real-ip"));
}

export async function isSignedIn() {
  const password = studioPassword();
  if (!password) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  return sessionMatches(value, password);
}

export async function signIn(attempt: string): Promise<{ error: string } | { ok: true }> {
  const password = studioPassword();
  if (!password) return { error: "The studio password is not configured." };
  const address = await clientAddress();
  if (isLockedOut(attempts(), address, Date.now())) {
    return { error: "Too many tries. Wait a few minutes and try again." };
  }
  if (attempt.length === 0 || attempt.length > 200 || !passwordMatches(attempt, password)) {
    recordFailure(attempts(), address, Date.now());
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { error: "That password is not the studio password." };
  }
  clearFailures(attempts(), address);
  const jar = await cookies();
  jar.set(COOKIE, mintSession(password), cookieOptions(SESSION_MS / 1000));
  jar.delete({ name: LEGACY_COOKIE, path: "/" });
  return { ok: true as const };
}

export async function signOut() {
  const jar = await cookies();
  jar.set(COOKIE, "", cookieOptions(0));
  jar.delete({ name: LEGACY_COOKIE, path: "/" });
}

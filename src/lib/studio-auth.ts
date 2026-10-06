/*
 * Studio-desk session. The cookie holds an HMAC of a fixed string, keyed by
 * the password. It does not hold the password. comparing digests with
 * timingSafeEqual avoids a byte-by-byte early exit.
 *
 * cookies() and headers() are request-scoped Next APIs. Calling them marks
 * the route dynamic. The failed-login map hangs off globalThis because a
 * module-level Map would look like one, but on Vercel each instance has its
 * own memory and cold starts wipe it. The limit is per process, not global.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";

const COOKIE = "studio_desk";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 8;
const SESSION_DAYS = 14;

type AttemptBucket = Map<string, number[]>;

function attempts() {
  const globalState = globalThis as typeof globalThis & { __studioDeskAttempts?: AttemptBucket };
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

export function mintSession(password: string) {
  return createHmac("sha256", signingKey(password)).update("desk-session-v1").digest("hex");
}

export function sessionMatches(cookie: string, password: string) {
  const expected = mintSession(password);
  const left = Buffer.from(cookie);
  const right = Buffer.from(expected);
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
    path: "/",
    maxAge,
  };
}

export async function clientAddress() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const address = forwarded || headerList.get("x-real-ip")?.trim() || "unknown";
  return address.slice(0, 80);
}

function lockedOut(address: string) {
  const now = Date.now();
  const recent = (attempts().get(address) || []).filter((time) => now - time < WINDOW_MS);
  attempts().set(address, recent);
  return recent.length >= MAX_TRIES;
}

function recordFailure(address: string) {
  const now = Date.now();
  const recent = (attempts().get(address) || []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  attempts().set(address, recent);
}

function clearFailures(address: string) {
  attempts().delete(address);
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
  if (lockedOut(address)) {
    return { error: "Too many tries. Wait a few minutes and try again." };
  }
  if (attempt.length === 0 || attempt.length > 200 || !passwordMatches(attempt, password)) {
    recordFailure(address);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { error: "That password is not the studio password." };
  }
  clearFailures(address);
  const jar = await cookies();
  jar.set(COOKIE, mintSession(password), cookieOptions(60 * 60 * 24 * SESSION_DAYS));
  return { ok: true as const };
}

export async function signOut() {
  const jar = await cookies();
  jar.set(COOKIE, "", cookieOptions(0));
}

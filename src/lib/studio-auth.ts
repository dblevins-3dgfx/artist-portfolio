import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";

export const STUDIO_COOKIE = "studio_session";

const BLOCKED = new Set([
  "change-me",
  "replace-with-a-long-password",
  "password",
  "studio",
]);

export function studioPassword() {
  const value = process.env.STUDIO_PASSWORD?.trim() ?? "";
  if (value.length < 12) return null;
  if (BLOCKED.has(value.toLowerCase())) return null;
  return value;
}

export function sessionToken(password: string) {
  return createHmac("sha256", password).update("studio-session-v1").digest("hex");
}

export function safeEqual(input: string, expected: string) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function isStudioAuthed() {
  const password = studioPassword();
  if (!password) return false;
  const jar = await cookies();
  const token = jar.get(STUDIO_COOKIE)?.value;
  if (!token) return false;
  return safeEqual(token, sessionToken(password));
}

export async function studioCookieOptions() {
  const headerList = await headers();
  const secure = headerList.get("x-forwarded-proto") === "https";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

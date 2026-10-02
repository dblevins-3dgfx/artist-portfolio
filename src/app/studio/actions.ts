"use server";

import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit";
import { updateRequestStatus } from "@/lib/requests-store";
import type { RequestStatus } from "@/lib/types";
import {
  isStudioAuthed,
  safeEqual,
  sessionToken,
  STUDIO_COOKIE,
  studioCookieOptions,
  studioPassword,
} from "@/lib/studio-auth";
import { cookies, headers } from "next/headers";

const STATUSES = new Set<RequestStatus>(["new", "confirmed", "shipped", "closed"]);

export async function login(
  _prev: { error: string },
  formData: FormData,
): Promise<{ error: string }> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = rateLimit(`login:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  const password = studioPassword();
  const input = String(formData.get("password") ?? "");
  if (!password || !safeEqual(input, password)) {
    return { error: "That password is not right." };
  }

  const jar = await cookies();
  jar.set(STUDIO_COOKIE, sessionToken(password), await studioCookieOptions());
  redirect("/studio");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(STUDIO_COOKIE);
  redirect("/studio");
}

export async function setStatus(formData: FormData) {
  if (!(await isStudioAuthed())) {
    redirect("/studio");
  }
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as RequestStatus;
  if (!STATUSES.has(status) || !id.startsWith("PR-")) return;
  await updateRequestStatus(id, status);
}

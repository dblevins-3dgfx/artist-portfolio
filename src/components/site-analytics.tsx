"use client";

/*
 * Vercel Web Analytics (#118): counts page views, so the most visited
 * /work/<slug> pages are the most popular paintings. No cookies. Turned on
 * in the Vercel project's Analytics tab; until then nothing is recorded.
 *
 * beforeSend drops two kinds of view before anything leaves the browser:
 *   - the studio desk (/curate and below), so editing is never counted;
 *   - every view in a browser that has signed in to the desk, so the
 *     artist's own browsing does not inflate the numbers. The desk list sets
 *     SKIP_KEY (markOwnBrowser); clearing the site's data undoes it.
 * Storage can be unavailable (private windows, blocked site data), so each
 * access is guarded and falls back to counting the view.
 */
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

export const SKIP_KEY = "studio-desk-browser";

export function isDeskPath(url: string) {
  const path = new URL(url, "https://example.invalid").pathname;
  return path === "/curate" || path.startsWith("/curate/");
}

function ownBrowser() {
  try {
    return window.localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOwnBrowser() {
  try {
    window.localStorage.setItem(SKIP_KEY, "1");
  } catch {
    // Storage blocked: this browser's views keep being counted.
  }
}

function beforeSend(event: BeforeSendEvent) {
  if (isDeskPath(event.url) || ownBrowser()) return null;
  return event;
}

export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}

/*
 * The studio desk's failed-login lockout and the address it counts by, as
 * pure functions. studio-auth.ts owns the real map (on globalThis, one per
 * server process), reads the clock, and reads the request headers; these
 * functions take all of that as arguments, so the rules can be tested
 * without a server or a real clock (login-attempts.test.ts).
 *
 * The rule: MAX_TRIES failed passwords from one address within WINDOW_MS
 * locks that address out until the oldest of them ages past the window.
 * A correct password clears the address's count.
 */
export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_TRIES = 8;

// Failure times, newest last, for each address.
export type Attempts = Map<string, number[]>;

// Failed tries from this address inside the window. Older ones are dropped
// from the map as a side effect, so the list never grows without bound.
// The returned array is the one stored in the map.
export function recentFailures(attempts: Attempts, address: string, now: number) {
  const recent = (attempts.get(address) || []).filter((time) => now - time < WINDOW_MS);
  attempts.set(address, recent);
  return recent;
}

export function isLockedOut(attempts: Attempts, address: string, now: number) {
  return recentFailures(attempts, address, now).length >= MAX_TRIES;
}

export function recordFailure(attempts: Attempts, address: string, now: number) {
  recentFailures(attempts, address, now).push(now);
}

export function clearFailures(attempts: Attempts, address: string) {
  attempts.delete(address);
}

// The address to count a sign-in attempt against: the first entry of
// X-Forwarded-For (the original client, as Vercel sets it), else
// X-Real-IP, else "unknown". Capped so a huge header cannot become a huge
// map key.
export function clientAddressFrom(forwardedFor: string | null, realIp: string | null) {
  const forwarded = forwardedFor?.split(",")[0]?.trim() || "";
  const address = forwarded || realIp?.trim() || "unknown";
  return address.slice(0, 80);
}

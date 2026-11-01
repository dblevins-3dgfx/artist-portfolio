import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_TRIES,
  WINDOW_MS,
  clearFailures,
  clientAddressFrom,
  isLockedOut,
  recentFailures,
  recordFailure,
  type Attempts,
} from "@/lib/login-attempts";

const START = 1_800_000_000_000;
const MINUTE = 60 * 1000;
const HOME = "203.0.113.7";

// `count` failures from one address, a second apart, ending at `end`.
function fail(attempts: Attempts, count: number, end = START, address = HOME) {
  for (let index = count - 1; index >= 0; index -= 1) recordFailure(attempts, address, end - index * 1000);
}

test("the rule is 8 tries in 15 minutes", () => {
  assert.equal(MAX_TRIES, 8);
  assert.equal(WINDOW_MS, 15 * MINUTE);
});

test("7 failures do not lock an address; the 8th does", () => {
  const attempts: Attempts = new Map();
  fail(attempts, 7);
  assert.equal(isLockedOut(attempts, HOME, START), false);
  recordFailure(attempts, HOME, START + 1000);
  assert.equal(isLockedOut(attempts, HOME, START + 1000), true);
});

test("an address with no failures is not locked", () => {
  assert.equal(isLockedOut(new Map(), HOME, START), false);
});

test("failures older than 15 minutes stop counting, so the lock lifts", () => {
  const attempts: Attempts = new Map();
  fail(attempts, MAX_TRIES);
  assert.equal(isLockedOut(attempts, HOME, START + 14 * MINUTE), true);
  // The oldest failure was 7 seconds before START; once it is a full window
  // old, only 7 remain inside the window.
  assert.equal(isLockedOut(attempts, HOME, START - 7000 + WINDOW_MS), false);
  // Well past the window, nothing counts.
  assert.equal(recentFailures(attempts, HOME, START + 2 * WINDOW_MS).length, 0);
});

test("a failure exactly one window old no longer counts", () => {
  const attempts: Attempts = new Map();
  recordFailure(attempts, HOME, START);
  assert.equal(recentFailures(attempts, HOME, START + WINDOW_MS - 1).length, 1);
  assert.equal(recentFailures(attempts, HOME, START + WINDOW_MS).length, 0);
});

test("a correct password clears the address's count", () => {
  const attempts: Attempts = new Map();
  fail(attempts, MAX_TRIES);
  assert.equal(isLockedOut(attempts, HOME, START), true);
  clearFailures(attempts, HOME);
  assert.equal(attempts.has(HOME), false);
  assert.equal(isLockedOut(attempts, HOME, START), false);
});

test("addresses are counted separately", () => {
  const attempts: Attempts = new Map();
  fail(attempts, MAX_TRIES, START, HOME);
  fail(attempts, 3, START, "198.51.100.4");
  assert.equal(isLockedOut(attempts, HOME, START), true);
  assert.equal(isLockedOut(attempts, "198.51.100.4", START), false);
  clearFailures(attempts, "198.51.100.4");
  assert.equal(isLockedOut(attempts, HOME, START), true, "clearing one address leaves the other locked");
});

test("old failures are dropped as they are read, so the list cannot grow without bound", () => {
  const attempts: Attempts = new Map();
  for (let hour = 0; hour < 24; hour += 1) recordFailure(attempts, HOME, START + hour * 60 * MINUTE);
  // Each new failure is an hour after the last, so only one is ever inside
  // the window and the stored list stays at one entry.
  assert.equal(attempts.get(HOME)?.length, 1);
});

test("the client address is the first X-Forwarded-For entry, trimmed", () => {
  assert.equal(clientAddressFrom(" 203.0.113.7 , 10.0.0.1, 10.0.0.2", "10.9.9.9"), "203.0.113.7");
  assert.equal(clientAddressFrom("2001:db8::1", null), "2001:db8::1");
});

test("without X-Forwarded-For it falls back to X-Real-IP, then to unknown", () => {
  assert.equal(clientAddressFrom(null, " 198.51.100.4 "), "198.51.100.4");
  assert.equal(clientAddressFrom("", "198.51.100.4"), "198.51.100.4");
  assert.equal(clientAddressFrom(" , 10.0.0.1", "198.51.100.4"), "198.51.100.4");
  assert.equal(clientAddressFrom(null, null), "unknown");
  assert.equal(clientAddressFrom(null, "  "), "unknown");
});

test("a very long header is capped so it cannot become a huge key", () => {
  assert.equal(clientAddressFrom("x".repeat(500), null).length, 80);
});

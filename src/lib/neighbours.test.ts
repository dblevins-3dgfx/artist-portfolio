import assert from "node:assert/strict";
import { test } from "node:test";
import { neighbours } from "@/lib/neighbours";
import type { SubjectId } from "@/lib/subjects";

const work = (slug: string, ...subjects: SubjectId[]) => ({ slug, subjects });

const catalog = [
  work("a", "places"),
  work("b", "animals"),
  work("c", "places", "commissioned"),
  work("d"),
  work("e", "commissioned"),
  work("f", "places"),
];

const slugsOf = (result: ReturnType<typeof neighbours>) => [result.previous?.slug, result.next?.slug, result.subject];

test("steps within the main subject and wraps at the ends", () => {
  assert.deepEqual(slugsOf(neighbours(catalog, "a")), ["f", "c", "places"]);
  assert.deepEqual(slugsOf(neighbours(catalog, "c")), ["a", "f", "places"]);
  assert.deepEqual(slugsOf(neighbours(catalog, "f")), ["c", "a", "places"]);
});

test("only the first subject counts, matching the grouped /work page", () => {
  // c is also Commissioned, but files under Places, so e is alone.
  assert.deepEqual(slugsOf(neighbours(catalog, "e")), ["d", "f", undefined]);
});

test("a painting alone in its subject, or with none, walks the whole catalog", () => {
  assert.deepEqual(slugsOf(neighbours(catalog, "b")), ["a", "c", undefined]);
  assert.deepEqual(slugsOf(neighbours(catalog, "d")), ["c", "e", undefined]);
});

test("one painting or an unknown slug has no neighbours", () => {
  assert.deepEqual(neighbours([work("a")], "a"), {});
  assert.deepEqual(neighbours(catalog, "zzz"), {});
});

import assert from "node:assert/strict";
import { test } from "node:test";
import type { Manifest } from "@/lib/catalog";
import { POSSIBLE_DUPLICATE_DISTANCE, catalogLikeness, joinTitles } from "@/lib/duplicates";
import type { Work } from "@/lib/types";

// Fingerprints are 16 hex digits (64 bits); the distance is how many bits
// differ. Each hex "f" is four set bits, so these sit at known distances
// from ZERO: FOUR is 4 bits away, FIVE is 5, EIGHT is 8.
const ZERO = "0000000000000000";
const FOUR = "000000000000000f";
const FIVE = "000000000000001f";
const EIGHT = "00000000000000ff";
const FAR = "ffffffffffffffff";

function work(slug: string, title = slug): Work {
  return {
    title,
    year: 2024,
    medium: "Oil",
    surface: "linen",
    widthIn: 12,
    heightIn: 16,
    statement: "",
    subjects: [],
    featured: false,
    originalStatus: "not-for-sale",
    originalPrice: 0,
    printsAvailable: true,
    slug,
    image: `/art/${slug}.jpg`,
    imageWidth: 1400,
    imageHeight: 1000,
  };
}

// A manifest giving each slug the fingerprint listed; `undefined` leaves a
// preview with no fingerprint, as older entries have.
function marks(fingerprints: Record<string, string | undefined>): Manifest {
  const files: Manifest["files"] = {};
  for (const [slug, fingerprint] of Object.entries(fingerprints)) {
    files[`${slug}.jpg`] = { width: 1400, height: 1000, sha256: `sha-${slug}`, ...(fingerprint ? { fingerprint } : {}) };
  }
  return { files };
}

const slugs = (groups: { slug: string }[][]) => groups.map((group) => group.map((member) => member.slug));

test("the fixtures sit where the threshold says", () => {
  assert.equal(POSSIBLE_DUPLICATE_DISTANCE, 4);
});

test("paintings 4 bits apart are grouped; 5 bits apart are not", () => {
  const works = [work("lake"), work("shore")];
  assert.deepEqual(slugs(catalogLikeness(works, marks({ lake: ZERO, shore: FOUR })).groups), [["lake", "shore"]]);
  assert.deepEqual(catalogLikeness(works, marks({ lake: ZERO, shore: FIVE })).groups, []);
});

test("identical fingerprints are grouped", () => {
  const works = [work("lake"), work("lake-again")];
  assert.deepEqual(slugs(catalogLikeness(works, marks({ lake: ZERO, "lake-again": ZERO })).groups), [["lake", "lake-again"]]);
});

test("paintings with no fingerprint, or a malformed one, are never grouped", () => {
  const works = [work("lake"), work("shore"), work("pond")];
  const result = catalogLikeness(works, marks({ lake: ZERO, shore: undefined, pond: "not-a-fingerprint" }));
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.notes, {});
  // A painting missing from the manifest altogether is skipped the same way.
  assert.deepEqual(catalogLikeness(works, marks({ lake: ZERO })).groups, []);
});

test("likeness chains: A near B and B near C make one group even when A and C are far apart", () => {
  // ZERO→FOUR is 4 bits and FOUR→EIGHT is 4 bits, but ZERO→EIGHT is 8.
  const works = [work("a"), work("b"), work("c")];
  const result = catalogLikeness(works, marks({ a: ZERO, b: FOUR, c: EIGHT }));
  assert.deepEqual(slugs(result.groups), [["a", "b", "c"]]);
});

test("separate pairs make separate groups, and unrelated paintings are left out", () => {
  const works = [work("a"), work("b"), work("c"), work("d"), work("e")];
  const result = catalogLikeness(works, marks({ a: ZERO, b: FOUR, c: FAR, d: "fffffffffffffff0", e: "0f0f0f0f0f0f0f0f" }));
  assert.deepEqual(slugs(result.groups), [
    ["a", "b"],
    ["c", "d"],
  ]);
  assert.equal("e" in result.notes, false);
});

test("each member's note names the others by title", () => {
  const pair = catalogLikeness([work("img-7889", "IMG 7889"), work("castle-rock", "Castle Rock")], marks({ "img-7889": ZERO, "castle-rock": FOUR }));
  assert.deepEqual(pair.notes, {
    "img-7889": "Possible duplicate of Castle Rock.",
    "castle-rock": "Possible duplicate of IMG 7889.",
  });

  const three = catalogLikeness([work("a", "A"), work("b", "B"), work("c", "C")], marks({ a: ZERO, b: ZERO, c: ZERO }));
  assert.deepEqual(three.notes, {
    a: "Possible duplicate of B and C.",
    b: "Possible duplicate of A and C.",
    c: "Possible duplicate of A and B.",
  });
});

test("an empty catalog has no groups and no notes", () => {
  assert.deepEqual(catalogLikeness([], { files: {} }), { groups: [], notes: {} });
});

test("joinTitles reads like a sentence", () => {
  assert.equal(joinTitles([]), "");
  assert.equal(joinTitles(["A"]), "A");
  assert.equal(joinTitles(["A", "B"]), "A and B");
  assert.equal(joinTitles(["A", "B", "C"]), "A, B, and C");
  assert.equal(joinTitles(["A", "B", "C", "D"]), "A, B, C, and D");
});

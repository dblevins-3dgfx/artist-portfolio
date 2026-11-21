import assert from "node:assert/strict";
import { test } from "node:test";
import { RELATED_COUNT, relatedWorks } from "@/lib/related";
import type { SubjectId } from "@/lib/subjects";

const painting = (slug: string, ...subjects: SubjectId[]) => ({ slug, subjects });
const slugs = (works: { slug: string }[]) => works.map((work) => work.slug);

test("four paintings are picked, never the painting itself", () => {
  const works = Array.from({ length: 10 }, (_, index) => painting(`p${index}`, "animals"));
  const picked = relatedWorks(works, works[3]);
  assert.equal(RELATED_COUNT, 4);
  assert.equal(picked.length, 4);
  assert.equal(slugs(picked).includes("p3"), false);
  assert.equal(new Set(slugs(picked)).size, 4, "no painting twice");
});

test("a small catalog gives as many as there are", () => {
  const works = [painting("a", "animals"), painting("b"), painting("c", "places")];
  assert.deepEqual(slugs(relatedWorks(works, works[0])).sort(), ["b", "c"]);
  assert.deepEqual(relatedWorks([works[0]], works[0]), []);
});

test("the main subject comes first, then any shared subject, then the rest", () => {
  const work = painting("portrait-of-ann", "portraits", "commissioned");
  const works = [
    work,
    painting("other-commission", "commissioned"),
    painting("unrelated-barn", "places"),
    painting("another-portrait", "portraits"),
    painting("no-subject"),
    painting("portrait-and-place", "places", "portraits"),
  ];
  const picked = slugs(relatedWorks(works, work, 5));
  // Both portraits (in either order), then the commission, then the rest.
  assert.deepEqual(picked.slice(0, 2).sort(), ["another-portrait", "portrait-and-place"]);
  assert.equal(picked[2], "other-commission");
  assert.deepEqual(picked.slice(3).sort(), ["no-subject", "unrelated-barn"]);
});

test("a painting shows the same picks every time, whatever order the catalog is in", () => {
  const works = Array.from({ length: 30 }, (_, index) => painting(`child-${index}`, "children"));
  const first = slugs(relatedWorks(works, works[7]));
  assert.deepEqual(slugs(relatedWorks(works, works[7])), first);
  assert.deepEqual(slugs(relatedWorks([...works].reverse(), works[7])), first);
});

test("paintings in a large subject show different picks, spread across the subject", () => {
  // The old list gave every painting in a subject the same first three.
  const works = Array.from({ length: 32 }, (_, index) => painting(`child-${index}`, "children"));
  const pickSets = new Set(works.map((work) => slugs(relatedWorks(works, work)).join(",")));
  const everShown = new Set(works.flatMap((work) => slugs(relatedWorks(works, work))));
  assert.ok(pickSets.size > 25, `only ${pickSets.size} different sets of picks`);
  assert.ok(everShown.size > 25, `only ${everShown.size} of 32 paintings ever shown`);
});

test("a painting with no subject gets a pick from the whole catalog", () => {
  const works = [
    painting("untitled"),
    ...Array.from({ length: 12 }, (_, index) => painting(`a-${index}`, index % 2 ? "animals" : "places")),
  ];
  const picked = relatedWorks(works, works[0]);
  assert.equal(picked.length, 4);
  assert.equal(slugs(picked).includes("untitled"), false);
});

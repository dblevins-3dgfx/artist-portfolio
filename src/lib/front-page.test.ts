import assert from "node:assert/strict";
import { test } from "node:test";
import { frontPageDateKey, selectFrontPage } from "@/lib/front-page";
import type { Work } from "@/lib/types";

function work(slug: string, featured = false): Work {
  return {
    slug,
    title: slug,
    year: 2024,
    medium: "",
    surface: "",
    widthIn: 0,
    heightIn: 0,
    statement: "",
    subjects: [],
    featured,
    originalStatus: "not-for-sale",
    originalPrice: 0,
    printsAvailable: false,
    image: `/art/${slug}.jpg`,
    imageWidth: 0,
    imageHeight: 0,
  };
}

const catalog = Array.from({ length: 20 }, (_, i) => work(`work-${i}`));
const slugs = (works: Work[]) => works.map((w) => w.slug);

test("the date key turns over at midnight in the studio's time zone", () => {
  // 23:30 on Jan 1 in Los Angeles, already Jan 2 in UTC.
  assert.equal(frontPageDateKey(new Date("2026-01-02T07:30:00Z")), "2026-01-01");
  assert.equal(frontPageDateKey(new Date("2026-01-02T08:30:00Z")), "2026-01-02");
  // Daylight saving time: midnight is 07:00 UTC in July.
  assert.equal(frontPageDateKey(new Date("2026-07-04T06:59:00Z")), "2026-07-03");
  assert.equal(frontPageDateKey(new Date("2026-07-04T07:00:00Z")), "2026-07-04");
});

test("the same day always gives the same front page", () => {
  const first = selectFrontPage(catalog, "2026-03-14");
  const again = selectFrontPage([...catalog], "2026-03-14");
  assert.equal(first.lead.slug, again.lead.slug);
  assert.deepEqual(slugs(first.selected), slugs(again.selected));
});

test("different days give different front pages", () => {
  const days = ["2026-03-14", "2026-03-15", "2026-03-16", "2026-03-17"];
  const sets = new Set(
    days.map((day) => {
      const page = selectFrontPage(catalog, day);
      return [page.lead.slug, ...slugs(page.selected)].join(",");
    }),
  );
  assert.equal(sets.size, days.length);
});

test("without pinned works, one lead and six distinct works fill the page", () => {
  const page = selectFrontPage(catalog, "2026-03-14");
  const shown = [page.lead.slug, ...slugs(page.selected)];
  assert.equal(page.selected.length, 6);
  assert.equal(new Set(shown).size, 7);
  for (const slug of shown) assert.ok(slugs(catalog).includes(slug));
});

test("pinned works lead the page in catalog order and the rest are filled", () => {
  const works = [work("a"), work("pinned-1", true), work("b"), work("pinned-2", true), ...catalog];
  const page = selectFrontPage(works, "2026-03-14");
  assert.equal(page.lead.slug, "pinned-1");
  assert.equal(page.selected[0].slug, "pinned-2");
  assert.equal(page.selected.length, 6);
  assert.ok(page.selected.slice(1).every((w) => !w.featured));
});

test("a small catalog shows what it has", () => {
  const page = selectFrontPage(catalog.slice(0, 3), "2026-03-14");
  assert.equal(page.selected.length, 2);
  assert.equal(new Set([page.lead.slug, ...slugs(page.selected)]).size, 3);
});

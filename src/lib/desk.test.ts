import assert from "node:assert/strict";
import { test } from "node:test";
import { DESK_FILTERS, deskFilter, missingDetails, needsWork } from "@/lib/desk";

const complete = {
  title: "Blue Sky, Blue Lake",
  subjects: ["places" as const],
  medium: "Oil",
  surface: "linen",
  widthIn: 12,
  heightIn: 16,
};

test("a painting with every detail needs nothing", () => {
  assert.deepEqual(missingDetails(complete), []);
});

test("each missing detail is named, in a fixed order", () => {
  assert.deepEqual(
    missingDetails({ title: "IMG 7889", subjects: [], medium: " ", surface: "", widthIn: 0, heightIn: 0 }),
    ["Title from file name", "No subject", "No medium", "No surface", "No size"],
  );
});

test("a size needs both width and height", () => {
  assert.deepEqual(missingDetails({ ...complete, heightIn: 0 }), ["No size"]);
  assert.deepEqual(missingDetails({ ...complete, widthIn: 0 }), ["No size"]);
});

test("camera file names are flagged as titles, and real titles are not", () => {
  for (const title of ["IMG 7889", "IMG 6727 Original", "img_4623", "DSC 0042", "PXL 20240101", "IMG 4977 Original Copy"]) {
    assert.deepEqual(missingDetails({ ...complete, title }), ["Title from file name"], title);
  }
  for (const title of ["Imagine", "Image of Spring", "The IMG 7889 Series", "1984", "Room 101"]) {
    assert.deepEqual(missingDetails({ ...complete, title }), [], title);
  }
});

const row = {
  ...complete,
  slug: "blue-sky-blue-lake",
  year: 2024,
  statement: "",
  featured: false,
  previewUrl: "",
  imageWidth: 0,
  imageHeight: 0,
  duplicateOf: "",
};

test("every badge has a filter with the same label", () => {
  const labels = DESK_FILTERS.map((filter) => filter.label);
  const everyBadge = missingDetails({ title: "IMG 1", subjects: [], medium: "", surface: "", widthIn: 0, heightIn: 0 });
  for (const badge of [...everyBadge, "Possible duplicate", "Front page"]) assert.ok(labels.includes(badge), badge);
  assert.equal(new Set(DESK_FILTERS.map((filter) => filter.id)).size, DESK_FILTERS.length);
});

test("each badge filter matches the paintings that show that badge", () => {
  const noSize = { ...row, heightIn: 0 };
  assert.equal(deskFilter("size").matches(noSize), true);
  assert.equal(deskFilter("size").matches(row), false);
  assert.equal(deskFilter("subject").matches({ ...row, subjects: [] }), true);
  assert.equal(deskFilter("title").matches({ ...row, title: "IMG 7889" }), true);
  assert.equal(deskFilter("duplicate").matches({ ...row, duplicateOf: "Possible duplicate of Castle Rock." }), true);
  assert.equal(deskFilter("front-page").matches({ ...row, featured: true }), true);
});

test("needs work is any missing detail or a possible duplicate, but not the front page", () => {
  assert.equal(needsWork(row), false);
  assert.equal(needsWork({ ...row, featured: true }), false);
  assert.equal(needsWork({ ...row, surface: "" }), true);
  assert.equal(needsWork({ ...row, duplicateOf: "Possible duplicate of Castle Rock." }), true);
  assert.equal(deskFilter("needs-work").matches({ ...row, surface: "" }), true);
});

test("an unknown or missing filter id falls back to All", () => {
  assert.equal(deskFilter("no-such-filter").id, "all");
  assert.equal(deskFilter(null).id, "all");
  assert.equal(deskFilter(undefined).matches(row), true);
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import type { Manifest } from "@/lib/catalog";
import type { WorkFields } from "@/lib/desk";
import { buildWork, checkSave, commitMessage, planPreviewFiles, planRemoval } from "@/lib/save-plan";
import type { Work } from "@/lib/types";

function work(slug: string, extra: Partial<Work> = {}): Work {
  return {
    title: slug,
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
    originalShownAt: "",
    printsShownAt: [],
    slug,
    image: `/art/${slug}.jpg`,
    imageWidth: 1400,
    imageHeight: 1000,
    ...extra,
  };
}

function fields(slug: string, extra: Partial<WorkFields> = {}): WorkFields {
  return {
    slug,
    title: "Lake",
    year: 2024,
    medium: "Oil",
    surface: "linen",
    widthIn: 12,
    heightIn: 16,
    statement: "",
    subjects: [],
    featured: false,
    ...extra,
  };
}

const manifest: Manifest = {
  files: {
    "lake.jpg": { width: 1400, height: 1000, sha256: "old-lake", fingerprint: "0123456789abcdef" },
    "shore.jpg": { width: 900, height: 1400, sha256: "old-shore" },
  },
};
const catalog = [work("lake"), work("shore", { imageWidth: 900, imageHeight: 1400 })];
const photo = { buffer: Buffer.from("new jpeg"), width: 1200, height: 800, sha256: "new-hash", fingerprint: "fedcba9876543210" };

test("checkSave: an edit finds its painting, an add needs a photograph", () => {
  assert.deepEqual(checkSave(catalog, "lake", fields("lake"), false), { existing: catalog[0] });
  assert.deepEqual(checkSave(catalog, "", fields("pond"), true), { existing: undefined });
  assert.ok("error" in checkSave(catalog, "", fields("pond"), false));
  assert.ok("error" in checkSave(catalog, "gone", fields("gone"), false));
});

test("checkSave: a web name another painting uses is refused, keeping your own is not", () => {
  assert.ok("error" in checkSave(catalog, "lake", fields("shore"), false));
  assert.ok("error" in checkSave(catalog, "", fields("shore"), true));
  assert.ok(!("error" in checkSave(catalog, "lake", fields("lake"), false)));
});

test("adding a painting writes its preview and manifest entry under the new web name", () => {
  const plan = planPreviewFiles({ slug: "pond", rendered: photo, manifest });
  assert.ok(!("error" in plan));
  assert.deepEqual(plan.files, [{ path: "public/art/pond.jpg", bytes: photo.buffer }]);
  assert.deepEqual(plan.manifest.files["pond.jpg"], { width: 1200, height: 800, sha256: "new-hash", fingerprint: "fedcba9876543210" });
  assert.deepEqual([plan.imageWidth, plan.imageHeight], [1200, 800]);
  assert.equal(Object.keys(manifest.files).length, 2, "the manifest passed in is not changed");
});

test("an edit with no new photograph and no rename touches no preview files", () => {
  const plan = planPreviewFiles({ existing: catalog[0], slug: "lake", rendered: null, manifest });
  assert.ok(!("error" in plan));
  assert.deepEqual(plan.files, []);
  assert.deepEqual(plan.manifest, manifest);
  assert.deepEqual([plan.imageWidth, plan.imageHeight], [1400, 1000]);
});

test("a new photograph replaces the preview and its manifest entry", () => {
  const plan = planPreviewFiles({ existing: catalog[0], slug: "lake", rendered: photo, manifest });
  assert.ok(!("error" in plan));
  assert.deepEqual(plan.files, [{ path: "public/art/lake.jpg", bytes: photo.buffer }]);
  assert.equal(plan.manifest.files["lake.jpg"].sha256, "new-hash");
  assert.deepEqual([plan.imageWidth, plan.imageHeight], [1200, 800]);
});

test("a rename with a new photograph writes the new file and deletes the old one", () => {
  const plan = planPreviewFiles({ existing: catalog[0], slug: "lake-at-dusk", rendered: photo, manifest });
  assert.ok(!("error" in plan));
  assert.deepEqual(plan.files, [
    { path: "public/art/lake-at-dusk.jpg", bytes: photo.buffer },
    { path: "public/art/lake.jpg", bytes: null },
  ]);
  assert.equal("lake.jpg" in plan.manifest.files, false);
  assert.equal(plan.manifest.files["lake-at-dusk.jpg"].sha256, "new-hash");
});

test("a rename without a new photograph moves the current preview and its manifest entry", () => {
  const current = Buffer.from("current jpeg");
  const plan = planPreviewFiles({ existing: catalog[0], slug: "lake-at-dusk", rendered: null, currentPreview: current, manifest });
  assert.ok(!("error" in plan));
  assert.deepEqual(plan.files, [
    { path: "public/art/lake-at-dusk.jpg", bytes: current },
    { path: "public/art/lake.jpg", bytes: null },
  ]);
  assert.deepEqual(plan.manifest.files["lake-at-dusk.jpg"], manifest.files["lake.jpg"]);
  assert.equal("lake.jpg" in plan.manifest.files, false);
  assert.deepEqual([plan.imageWidth, plan.imageHeight], [1400, 1000]);
});

test("a rename without a new photograph and no manifest entry records one from the bytes", () => {
  const current = Buffer.from("current jpeg");
  const plan = planPreviewFiles({ existing: catalog[0], slug: "lake-at-dusk", rendered: null, currentPreview: current, manifest: { files: {} } });
  assert.ok(!("error" in plan));
  assert.deepEqual(plan.manifest.files["lake-at-dusk.jpg"], {
    width: 1400,
    height: 1000,
    sha256: createHash("sha256").update(current).digest("hex"),
  });
});

test("a rename without a new photograph needs the current preview", () => {
  for (const currentPreview of [null, undefined]) {
    assert.ok("error" in planPreviewFiles({ existing: catalog[0], slug: "lake-at-dusk", rendered: null, currentPreview, manifest }));
  }
});

test("buildWork takes availability from the form when it had that section", () => {
  const built = buildWork(
    fields("lake", { availability: { originalStatus: "in-studio", originalPrice: 1200, printsAvailable: false } }),
    catalog[0],
    { imageWidth: 1400, imageHeight: 1000 },
    new Set(),
  );
  assert.deepEqual([built.originalStatus, built.originalPrice, built.printsAvailable], ["in-studio", 1200, false]);
  assert.equal(built.image, "/art/lake.jpg");
});

test("buildWork keeps a painting's availability when the form had no such section", () => {
  const sold = work("lake", { originalStatus: "sold", originalPrice: 950, printsAvailable: true });
  const built = buildWork(fields("lake"), sold, { imageWidth: 1400, imageHeight: 1000 }, new Set());
  assert.deepEqual([built.originalStatus, built.originalPrice, built.printsAvailable], ["sold", 950, true]);
  const added = buildWork(fields("pond"), undefined, { imageWidth: 1200, imageHeight: 800 }, new Set());
  assert.deepEqual([added.originalStatus, added.originalPrice, added.printsAvailable], ["not-for-sale", 0, false]);
});

const venues = new Set(["blue-door", "corner-shop"]);

test("buildWork takes showings from the form when it had that section", () => {
  const built = buildWork(
    fields("lake", {
      availability: { originalStatus: "in-studio", originalPrice: 1200, printsAvailable: true },
      showings: { originalShownAt: "blue-door", printsShownAt: ["corner-shop", "blue-door"] },
    }),
    catalog[0],
    { imageWidth: 1400, imageHeight: 1000 },
    venues,
  );
  assert.equal(built.originalShownAt, "blue-door");
  assert.deepEqual(built.printsShownAt, ["corner-shop", "blue-door"]);
});

test("buildWork keeps where a painting is shown when the form had no Showings section", () => {
  const shown = work("lake", { originalStatus: "in-studio", originalShownAt: "blue-door", printsShownAt: ["corner-shop"] });
  const built = buildWork(fields("lake"), shown, { imageWidth: 1400, imageHeight: 1000 }, venues);
  assert.deepEqual([built.originalShownAt, built.printsShownAt], ["blue-door", ["corner-shop"]]);
  const added = buildWork(fields("pond"), undefined, { imageWidth: 1200, imageHeight: 800 }, venues);
  assert.deepEqual([added.originalShownAt, added.printsShownAt], ["", []]);
});

test("buildWork drops the original's venue once it is not Available, and venues no longer on the list", () => {
  const shown = work("lake", { originalStatus: "in-studio", originalShownAt: "blue-door", printsShownAt: ["corner-shop", "gone"] });
  const sold = buildWork(
    fields("lake", { availability: { originalStatus: "sold", originalPrice: 0, printsAvailable: true } }),
    shown,
    { imageWidth: 1400, imageHeight: 1000 },
    venues,
  );
  assert.deepEqual([sold.originalShownAt, sold.printsShownAt], ["", ["corner-shop"]]);
});

test("buildWork drops the prints' venues once prints are not offered", () => {
  const shown = work("lake", { printsAvailable: true, printsShownAt: ["corner-shop"] });
  const built = buildWork(
    fields("lake", {
      availability: { originalStatus: "not-for-sale", originalPrice: 0, printsAvailable: false },
      showings: { originalShownAt: "", printsShownAt: ["corner-shop"] },
    }),
    shown,
    { imageWidth: 1400, imageHeight: 1000 },
    venues,
  );
  assert.deepEqual(built.printsShownAt, []);
});

test("commit messages keep the title on one short line", () => {
  assert.equal(commitMessage("Update", "Lake\n  at   dusk"), 'Update "Lake at dusk" from the studio desk');
  assert.equal(commitMessage("Add", "x".repeat(100)).length, 'Add "" from the studio desk'.length + 80);
});

test("removing a painting deletes its preview unless another entry still uses it", () => {
  const plan = planRemoval(catalog, manifest, "lake");
  assert.ok(!("error" in plan));
  assert.deepEqual(plan.works.map((w) => w.slug), ["shore"]);
  assert.deepEqual(plan.files, [{ path: "public/art/lake.jpg", bytes: null }]);
  assert.equal("lake.jpg" in plan.manifest.files, false);
  assert.equal(plan.message, 'Remove "lake" from the studio desk');

  const shared = [work("lake"), work("lake-copy", { image: "/art/lake.jpg" })];
  const kept = planRemoval(shared, manifest, "lake");
  assert.ok(!("error" in kept));
  assert.deepEqual(kept.files, []);
  assert.ok("lake.jpg" in kept.manifest.files);

  assert.ok("error" in planRemoval(catalog, manifest, "gone"));
});

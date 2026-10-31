import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import {
  MANIFEST_PATH,
  WORKS_PATH,
  assertCatalogPath,
  catalogFilePath,
  isCatalogSlug,
  parseManifest,
  parseWorks,
  serializeManifest,
  serializeWorks,
  toCatalogWork,
} from "@/lib/catalog";

test("web names are lowercase words joined by single hyphens", () => {
  for (const slug of ["bon-voyage", "a", "work-2"]) assert.equal(isCatalogSlug(slug), true, slug);
  for (const slug of ["", "Bon-Voyage", "bon--voyage", "-bon", "bon-", "bon voyage", "../x"]) {
    assert.equal(isCatalogSlug(slug), false, slug);
  }
});

test("only the catalog, the manifest, and preview images may be written", () => {
  for (const file of [WORKS_PATH, MANIFEST_PATH, "public/art/bon-voyage.jpg"]) {
    assert.doesNotThrow(() => assertCatalogPath(file), file);
  }
  const refused = [
    "content/studio.json",
    "./content/works.json",
    "content/../content/works.json",
    "public/art/../../package.json",
    "public/art/sub/bon-voyage.jpg",
    "public/art/Bon-Voyage.jpg",
    "public/art/bon-voyage.png",
    "public/art/.jpg.jpg/x",
    "/etc/passwd",
    "",
  ];
  for (const file of refused) assert.throws(() => assertCatalogPath(file), /Refusing/, file);
});

test("allowed paths resolve inside the project", () => {
  const root = process.cwd();
  assert.equal(catalogFilePath(WORKS_PATH), path.join(root, "content", "works.json"));
  assert.equal(catalogFilePath(MANIFEST_PATH), path.join(root, "content", "art-manifest.json"));
  assert.equal(catalogFilePath("public/art/bon-voyage.jpg"), path.join(root, "public", "art", "bon-voyage.jpg"));
  assert.throws(() => catalogFilePath("public/art/../secret.jpg"), /Refusing/);
});

test("parseWorks rejects a catalog that is not a list or has a bad web name", () => {
  assert.throws(() => parseWorks({}), /not a list/);
  assert.throws(() => parseWorks([{ slug: "ok" }, { slug: "Not OK" }]), /entry 2/);
  assert.throws(() => parseWorks([null]), /entry 1/);
});

test("parseWorks fills safe defaults for missing or wrong fields", () => {
  const [work] = parseWorks([
    { slug: "lake", year: 2020, originalStatus: "stolen", subject: "dragons", featured: "yes", widthIn: "12", originalPrice: "900" },
  ]);
  assert.deepEqual(work, {
    title: "lake",
    year: 2020,
    medium: "",
    surface: "",
    widthIn: 0,
    heightIn: 0,
    statement: "",
    subjects: [],
    featured: false,
    originalStatus: "not-for-sale",
    originalPrice: 0,
    printsAvailable: false,
    slug: "lake",
    image: "/art/lake.jpg",
    imageWidth: 0,
    imageHeight: 0,
  });
});

test("the image path always comes from the web name", () => {
  const [work] = parseWorks([{ slug: "lake", year: 2020, image: "/etc/passwd" }]);
  assert.equal(work.image, "/art/lake.jpg");
});

test("a missing year reads as 0, whatever today's date is", () => {
  const [work] = parseWorks([{ slug: "lake" }]);
  assert.equal(work.year, 0);
});

test("an older entry with one subject string reads as a one-item list", () => {
  const [old, blank, unknown] = parseWorks([
    { slug: "lake", subject: "places" },
    { slug: "pond", subject: "" },
    { slug: "cave", subject: "dragons" },
  ]);
  assert.deepEqual(old.subjects, ["places"]);
  assert.deepEqual(blank.subjects, []);
  assert.deepEqual(unknown.subjects, []);
});

test("a subjects list wins over an older subject string", () => {
  const [work] = parseWorks([{ slug: "lake", subject: "places", subjects: ["narratives"] }]);
  assert.deepEqual(work.subjects, ["narratives"]);
});

test("serializeWorks writes subjects and drops the older subject field", () => {
  const text = serializeWorks(parseWorks([{ slug: "lake", subject: "places" }]));
  const [entry] = JSON.parse(text);
  assert.deepEqual(entry.subjects, ["places"]);
  assert.equal("subject" in entry, false);
});

test("serializeWorks round-trips through parseWorks", () => {
  const works = parseWorks([
    {
      title: "Lake",
      year: 2021,
      medium: "Oil",
      surface: "Panel",
      widthIn: 8,
      heightIn: 10,
      statement: "Quiet.",
      subjects: ["places", "commissioned"],
      featured: true,
      originalStatus: "sold",
      originalPrice: 1800,
      printsAvailable: true,
      slug: "lake",
      imageWidth: 1400,
      imageHeight: 1120,
    },
  ]);
  const text = serializeWorks(works);
  assert.ok(text.endsWith("}\n]\n"));
  assert.deepEqual(parseWorks(JSON.parse(text)), works);
});

test("a price is whole dollars above 0; anything else reads as no price", () => {
  const prices = [1200, 0, -5, 12.5, "1200", null].map(
    (originalPrice) => parseWorks([{ slug: "lake", originalPrice }])[0].originalPrice,
  );
  assert.deepEqual(prices, [1200, 0, 0, 0, 0, 0]);
});

test("serializeWorks writes a price only when there is one", () => {
  const [priced, unpriced] = JSON.parse(
    serializeWorks(parseWorks([{ slug: "lake", originalPrice: 950 }, { slug: "shore" }])),
  );
  assert.equal(priced.originalPrice, 950);
  assert.equal("originalPrice" in unpriced, false);
});

test("the public view of a painting leaves out availability, price, and the front-page flag", () => {
  const [work] = parseWorks([
    { slug: "lake", title: "Lake", originalStatus: "in-studio", originalPrice: 1800, printsAvailable: true, featured: true },
  ]);
  const shown = toCatalogWork(work) as Record<string, unknown>;
  for (const key of ["originalStatus", "originalPrice", "printsAvailable", "featured", "widthIn", "heightIn"]) {
    assert.equal(key in shown, false, key);
  }
  assert.equal(shown.title, "Lake");
});

test("parseManifest keeps valid entries and drops bad ones", () => {
  const manifest = parseManifest({
    files: {
      "a.jpg": { width: 10, height: 20, sha256: "abc", fingerprint: "0123456789abcdef" },
      "b.jpg": { width: "10", sha256: "def", fingerprint: "not-a-fingerprint" },
      "c.jpg": { width: 10, height: 20 },
      "d.jpg": "junk",
    },
  });
  assert.deepEqual(manifest, {
    files: {
      "a.jpg": { width: 10, height: 20, sha256: "abc", fingerprint: "0123456789abcdef" },
      "b.jpg": { width: 0, height: 0, sha256: "def" },
    },
  });
  assert.deepEqual(parseManifest(null), { files: {} });
  assert.deepEqual(parseManifest({ files: [] }), { files: {} });
});

test("serializeManifest sorts file names so saves give stable diffs", () => {
  const text = serializeManifest({
    files: {
      "b.jpg": { width: 1, height: 1, sha256: "b" },
      "a.jpg": { width: 1, height: 1, sha256: "a" },
    },
  });
  assert.deepEqual(Object.keys(JSON.parse(text).files), ["a.jpg", "b.jpg"]);
  assert.ok(text.endsWith("\n"));
});

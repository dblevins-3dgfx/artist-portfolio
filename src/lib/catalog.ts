/*
 * The catalog document, shared by the site and the desk.
 *
 * parseWorks / serializeWorks are the only translation between the JSON file
 * and a Work[]. Callers pass `unknown` (a value the type checker will not
 * let you touch until you narrow it). There is no void* equivalent that
 * type-checks as anything.
 *
 * assertCatalogPath is the allow-list for anything written to disk or Git.
 * A save may touch content/works.json, content/art-manifest.json,
 * content/print-prices.json, and public/art/<slug>.jpg. Nothing else.
 */
import path from "path";
import { parseSubjects } from "@/lib/subjects";
import type { CatalogWork, OriginalStatus, Work } from "@/lib/types";

export const WORKS_PATH = "content/works.json";
export const MANIFEST_PATH = "content/art-manifest.json";
export const PRINT_PRICES_PATH = "content/print-prices.json";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FINGERPRINT = /^[0-9a-f]{16}$/;

// fingerprint is a 16-character likeness mark. The desk compares these.
// Keeping it here means a later save does not wipe the marks off the manifest.
export type ManifestFile = { width: number; height: number; sha256: string; fingerprint?: string };
export type Manifest = { files: Record<string, ManifestFile> };

export function isCatalogSlug(value: string) {
  return SLUG.test(value);
}

export function assertCatalogPath(filePath: string) {
  const allowed =
    filePath === WORKS_PATH ||
    filePath === MANIFEST_PATH ||
    filePath === PRINT_PRICES_PATH ||
    /^public\/art\/[a-z0-9-]+\.jpg$/.test(filePath);
  if (!allowed) throw new Error("Refusing to write that file.");
}

export function catalogFilePath(filePath: string) {
  assertCatalogPath(filePath);
  if (filePath === WORKS_PATH) return path.join(process.cwd(), "content", "works.json");
  if (filePath === MANIFEST_PATH) return path.join(process.cwd(), "content", "art-manifest.json");
  if (filePath === PRINT_PRICES_PATH) return path.join(process.cwd(), "content", "print-prices.json");
  const name = filePath.slice("public/art/".length);
  if (!/^[a-z0-9-]+\.jpg$/.test(name)) throw new Error("Refusing to write that file.");
  return path.join(process.cwd(), "public", "art", name);
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

// Older catalogs stored one `subject` string per painting. Read that as a
// one-item list so an entry written before the change still loads. Once
// saved again it is written back as `subjects`.
function readSubjects(record: Record<string, unknown>) {
  if (Array.isArray(record.subjects)) return parseSubjects(record.subjects);
  return parseSubjects(typeof record.subject === "string" ? [record.subject] : []);
}

export function parseWorks(value: unknown): Work[] {
  if (!Array.isArray(value)) throw new Error("The catalog is not a list.");
  return value.map((entry, index) => {
    const record = asRecord(entry);
    if (!record || typeof record.slug !== "string" || !SLUG.test(record.slug)) {
      throw new Error(`Catalog entry ${index + 1} has no usable web name.`);
    }
    const status = record.originalStatus;
    const originalStatus: OriginalStatus =
      status === "sold" || status === "in-studio" || status === "not-for-sale" ? status : "not-for-sale";
    return {
      title: typeof record.title === "string" ? record.title : record.slug,
      year: typeof record.year === "number" ? record.year : 0,
      medium: typeof record.medium === "string" ? record.medium : "",
      surface: typeof record.surface === "string" ? record.surface : "",
      widthIn: typeof record.widthIn === "number" ? record.widthIn : 0,
      heightIn: typeof record.heightIn === "number" ? record.heightIn : 0,
      statement: typeof record.statement === "string" ? record.statement : "",
      subjects: readSubjects(record),
      featured: record.featured === true,
      originalStatus,
      originalPrice:
        typeof record.originalPrice === "number" && Number.isInteger(record.originalPrice) && record.originalPrice > 0
          ? record.originalPrice
          : 0,
      printsAvailable: record.printsAvailable === true,
      slug: record.slug,
      image: `/art/${record.slug}.jpg`,
      imageWidth: typeof record.imageWidth === "number" ? record.imageWidth : 0,
      imageHeight: typeof record.imageHeight === "number" ? record.imageHeight : 0,
    };
  });
}

export function parseManifest(value: unknown): Manifest {
  const record = asRecord(value);
  const files = asRecord(record?.files) || {};
  const manifest: Manifest = { files: {} };
  for (const [name, entry] of Object.entries(files)) {
    const file = asRecord(entry);
    if (!file || typeof file.sha256 !== "string") continue;
    const parsed: ManifestFile = {
      width: typeof file.width === "number" ? file.width : 0,
      height: typeof file.height === "number" ? file.height : 0,
      sha256: file.sha256,
    };
    if (typeof file.fingerprint === "string" && FINGERPRINT.test(file.fingerprint)) {
      parsed.fingerprint = file.fingerprint;
    }
    manifest.files[name] = parsed;
  }
  return manifest;
}

export function serializeWorks(works: Work[]) {
  return `${JSON.stringify(
    works.map((work) => ({
      title: work.title,
      year: work.year,
      medium: work.medium,
      surface: work.surface,
      widthIn: work.widthIn,
      heightIn: work.heightIn,
      statement: work.statement,
      subjects: work.subjects,
      featured: work.featured,
      originalStatus: work.originalStatus,
      // Written only when set, so paintings without a price keep their entry
      // unchanged and the file does not gain a 0 on every painting.
      ...(work.originalPrice > 0 ? { originalPrice: work.originalPrice } : {}),
      printsAvailable: work.printsAvailable,
      slug: work.slug,
      image: work.image,
      imageWidth: work.imageWidth,
      imageHeight: work.imageHeight,
    })),
    null,
    2,
  )}\n`;
}

export function serializeManifest(manifest: Manifest) {
  const files: Manifest["files"] = {};
  for (const name of Object.keys(manifest.files).sort()) files[name] = manifest.files[name];
  return `${JSON.stringify({ files }, null, 2)}\n`;
}

// The public pages' view of a painting. Built field by field so a desk-only
// field (availability, price, front-page flag) cannot ride along.
export function toCatalogWork(work: Work): CatalogWork {
  return {
    slug: work.slug,
    title: work.title,
    year: work.year,
    medium: work.medium,
    surface: work.surface,
    statement: work.statement,
    subjects: work.subjects,
    image: work.image,
    imageWidth: work.imageWidth,
    imageHeight: work.imageHeight,
  };
}

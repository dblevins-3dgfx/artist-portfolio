import path from "path";
import { parseSubject } from "@/lib/subjects";
import type { OriginalStatus, Work } from "@/lib/types";

export const WORKS_PATH = "content/works.json";
export const MANIFEST_PATH = "content/art-manifest.json";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ManifestFile = { width: number; height: number; sha256: string };
export type Manifest = { files: Record<string, ManifestFile> };

export function isCatalogSlug(value: string) {
  return SLUG.test(value);
}

export function assertCatalogPath(filePath: string) {
  const allowed =
    filePath === WORKS_PATH ||
    filePath === MANIFEST_PATH ||
    /^public\/art\/[a-z0-9-]+\.jpg$/.test(filePath);
  if (!allowed) throw new Error("Refusing to write that file.");
}

export function catalogFilePath(filePath: string) {
  assertCatalogPath(filePath);
  if (filePath === WORKS_PATH) return path.join(process.cwd(), "content", "works.json");
  if (filePath === MANIFEST_PATH) return path.join(process.cwd(), "content", "art-manifest.json");
  const name = filePath.slice("public/art/".length);
  if (!/^[a-z0-9-]+\.jpg$/.test(name)) throw new Error("Refusing to write that file.");
  return path.join(process.cwd(), "public", "art", name);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
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
      year: typeof record.year === "number" ? record.year : new Date().getFullYear(),
      medium: typeof record.medium === "string" ? record.medium : "",
      surface: typeof record.surface === "string" ? record.surface : "",
      widthIn: typeof record.widthIn === "number" ? record.widthIn : 0,
      heightIn: typeof record.heightIn === "number" ? record.heightIn : 0,
      statement: typeof record.statement === "string" ? record.statement : "",
      subject: parseSubject(record.subject),
      featured: record.featured === true,
      originalStatus,
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
    manifest.files[name] = {
      width: typeof file.width === "number" ? file.width : 0,
      height: typeof file.height === "number" ? file.height : 0,
      sha256: file.sha256,
    };
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
      subject: work.subject,
      featured: work.featured,
      originalStatus: work.originalStatus,
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

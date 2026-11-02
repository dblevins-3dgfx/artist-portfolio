/*
 * The decisions behind a desk save or remove, as pure functions: no disk,
 * no GitHub, no image processing. catalog-store.ts loads the catalog,
 * renders the photograph, reads the current preview when a rename needs
 * it, and commits what these functions return. Keeping them apart is what
 * lets the rename and photo rules be unit-tested (save-plan.test.ts).
 *
 * A refusal comes back as `{ error }` with the sentence the form shows.
 */
import { createHash } from "crypto";
import type { Manifest } from "@/lib/catalog";
import type { WorkFields } from "@/lib/desk";
import type { Work } from "@/lib/types";
import { cleanShowings } from "@/lib/venues";

// One file a save writes (bytes) or deletes (null).
export type FileChange = { path: string; bytes: Buffer | null };

// The parts of a rendered preview a save needs (see renderPreview).
export type RenderedPreview = {
  buffer: Buffer;
  width: number;
  height: number;
  sha256: string;
  fingerprint: string;
};

const previewPath = (slug: string) => `public/art/${slug}.jpg`;
const previewName = (slug: string) => `${slug}.jpg`;

// Is this save allowed against the catalog as it is now? `existing` is the
// painting being edited, or undefined when adding one.
export function checkSave(
  works: Work[],
  existingSlug: string,
  fields: WorkFields,
  hasNewPhoto: boolean,
): { error: string } | { existing?: Work } {
  const existing = existingSlug ? works.find((work) => work.slug === existingSlug) : undefined;
  if (existingSlug && !existing) return { error: "That painting is no longer in the catalog. Reload the page." };
  if (!existing && !hasNewPhoto) return { error: "Choose a photograph to add." };
  if (works.some((work) => work.slug === fields.slug && work.slug !== existingSlug)) {
    return { error: "Another painting already uses that web name. Change the title or the web name." };
  }
  return { existing };
}

// Which preview files to write or delete, and the manifest to match.
//   new photograph:         write it under the new web name; on a rename,
//                           delete the old file and its manifest entry
//   rename, same photograph: copy the current preview to the new name and
//                           move its manifest entry; `currentPreview` must
//                           be the old file's bytes (null when missing)
//   anything else:          no preview files change
// The manifest passed in is not modified; a new one is returned.
export function planPreviewFiles({
  existing,
  slug,
  rendered,
  currentPreview,
  manifest,
}: {
  existing?: Work;
  slug: string;
  rendered: RenderedPreview | null;
  currentPreview?: Buffer | null;
  manifest: Manifest;
}): { error: string } | { files: FileChange[]; manifest: Manifest; imageWidth: number; imageHeight: number } {
  const files: FileChange[] = [];
  const next: Manifest = { files: { ...manifest.files } };
  const renamed = existing !== undefined && existing.slug !== slug;

  if (rendered) {
    files.push({ path: previewPath(slug), bytes: rendered.buffer });
    next.files[previewName(slug)] = {
      width: rendered.width,
      height: rendered.height,
      sha256: rendered.sha256,
      fingerprint: rendered.fingerprint,
    };
    if (renamed) {
      delete next.files[previewName(existing.slug)];
      files.push({ path: previewPath(existing.slug), bytes: null });
    }
    return { files, manifest: next, imageWidth: rendered.width, imageHeight: rendered.height };
  }

  if (renamed) {
    if (!currentPreview) {
      return { error: "The current preview is missing. Choose the photograph again before changing the web name." };
    }
    files.push({ path: previewPath(slug), bytes: currentPreview });
    next.files[previewName(slug)] = manifest.files[previewName(existing.slug)] || {
      width: existing.imageWidth,
      height: existing.imageHeight,
      sha256: createHash("sha256").update(currentPreview).digest("hex"),
    };
    delete next.files[previewName(existing.slug)];
    files.push({ path: previewPath(existing.slug), bytes: null });
  }

  return { files, manifest: next, imageWidth: existing?.imageWidth ?? 0, imageHeight: existing?.imageHeight ?? 0 };
}

// The catalog entry a save writes. Availability comes from the form when
// it had that section; a form without it (a tab from before #72) keeps the
// painting's current values, and a new painting starts not for sale.
// Showings work the same way (#104), then keep only venues still on the
// list (`venueIds`), no venue for an original that is not Available, and
// none for prints that are not offered.
export function buildWork(
  fields: WorkFields,
  existing: Work | undefined,
  size: { imageWidth: number; imageHeight: number },
  venueIds: Set<string>,
): Work {
  const originalStatus = fields.availability?.originalStatus ?? existing?.originalStatus ?? "not-for-sale";
  const printsAvailable = fields.availability?.printsAvailable ?? existing?.printsAvailable ?? false;
  const showings = cleanShowings(
    fields.showings ?? {
      originalShownAt: existing?.originalShownAt ?? "",
      printsShownAt: existing?.printsShownAt ?? [],
    },
    { originalStatus, printsAvailable },
    venueIds,
  );
  return {
    title: fields.title,
    year: fields.year,
    medium: fields.medium,
    surface: fields.surface,
    widthIn: fields.widthIn,
    heightIn: fields.heightIn,
    statement: fields.statement,
    subjects: fields.subjects,
    featured: fields.featured,
    originalStatus,
    originalPrice: fields.availability?.originalPrice ?? existing?.originalPrice ?? 0,
    printsAvailable,
    originalShownAt: showings.originalShownAt,
    printsShownAt: showings.printsShownAt,
    slug: fields.slug,
    image: `/art/${fields.slug}.jpg`,
    imageWidth: size.imageWidth,
    imageHeight: size.imageHeight,
  };
}

// A git commit subject: the title on one line, short enough to read.
// Titles already in works.json may predate the form's whitespace cleanup.
export function commitMessage(verb: "Add" | "Update" | "Remove", title: string) {
  return `${verb} "${title.replace(/\s+/g, " ").slice(0, 80)}" from the studio desk`;
}

// Taking a painting off the catalog: the remaining works, the manifest
// without its preview, and the preview file to delete. The file is kept if
// another entry still points at the same image.
export function planRemoval(
  works: Work[],
  manifest: Manifest,
  slug: string,
): { error: string } | { works: Work[]; manifest: Manifest; files: FileChange[]; message: string } {
  const existing = works.find((work) => work.slug === slug);
  if (!existing) return { error: "That painting is no longer in the catalog. Reload the page." };
  const remaining = works.filter((work) => work.slug !== slug);
  const next: Manifest = { files: { ...manifest.files } };
  const files: FileChange[] = [];
  const filename = previewName(existing.slug);
  if (!remaining.some((work) => work.image === `/art/${filename}`)) {
    delete next.files[filename];
    files.push({ path: previewPath(existing.slug), bytes: null });
  }
  return { works: remaining, manifest: next, files, message: commitMessage("Remove", existing.title) };
}

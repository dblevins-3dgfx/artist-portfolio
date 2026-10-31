/*
 * Values that cross into the browser for the studio desk.
 * DeskWork is one row on the form. WorkFields is the validated save payload.
 * Publishing is where a save will land: GitHub (live site), this computer
 * (local dev), or nowhere (Vercel with no token). The browser uses it only
 * to choose which sentence to show. duplicateOf is empty, or a sentence
 * naming the other paintings that look like this one.
 *
 * missingDetails lists what a painting still lacks, for the badges on the
 * desk list. It reads only the row, so the browser can call it.
 */
import type { SubjectId } from "@/lib/subjects";

export type Publishing = "github" | "local" | "missing";

export type DeskWork = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  widthIn: number;
  heightIn: number;
  statement: string;
  subjects: SubjectId[];
  featured: boolean;
  previewUrl: string;
  imageWidth: number;
  imageHeight: number;
  duplicateOf: string;
};

export type WorkFields = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  widthIn: number;
  heightIn: number;
  statement: string;
  subjects: SubjectId[];
  featured: boolean;
};

// scripts/process-images.mjs titles a painting from its file name when no
// sidecar gives one, so IMG_7889.jpg arrives as "IMG 7889". A title still in
// that shape has not been named yet.
const CAMERA_FILE_TITLE = /^(?:IMG|DSC|DSCN|DCIM|PXL|MVIMG)[ _-]?\d+(?: (?:Original|Edited|Copy))*$/i;

export function missingDetails(
  work: Pick<DeskWork, "title" | "subjects" | "medium" | "surface" | "widthIn" | "heightIn">,
): string[] {
  const missing: string[] = [];
  if (CAMERA_FILE_TITLE.test(work.title.trim())) missing.push("Title from file name");
  if (work.subjects.length === 0) missing.push("No subject");
  if (!work.medium.trim()) missing.push("No medium");
  if (!work.surface.trim()) missing.push("No surface");
  if (!work.widthIn || !work.heightIn) missing.push("No size");
  return missing;
}

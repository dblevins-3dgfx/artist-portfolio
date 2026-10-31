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
 * DESK_FILTERS are the list's filter buttons. Each badge filter matches on
 * the same text the badge shows, so a badge and its filter cannot disagree.
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

export type DeskFilter = {
  id: string;
  label: string;
  matches: (work: DeskWork) => boolean;
};

function hasBadge(label: string) {
  return (work: DeskWork) => missingDetails(work).includes(label);
}

// "Needs work" is any missing detail or a possible duplicate. Front page and
// Saved are badges too, but neither is a problem to fix.
export function needsWork(work: DeskWork) {
  return missingDetails(work).length > 0 || work.duplicateOf !== "";
}

export const DESK_FILTERS: DeskFilter[] = [
  { id: "all", label: "All", matches: () => true },
  { id: "needs-work", label: "Needs work", matches: needsWork },
  { id: "title", label: "Title from file name", matches: hasBadge("Title from file name") },
  { id: "subject", label: "No subject", matches: hasBadge("No subject") },
  { id: "medium", label: "No medium", matches: hasBadge("No medium") },
  { id: "surface", label: "No surface", matches: hasBadge("No surface") },
  { id: "size", label: "No size", matches: hasBadge("No size") },
  { id: "duplicate", label: "Possible duplicate", matches: (work) => work.duplicateOf !== "" },
  { id: "front-page", label: "Front page", matches: (work) => work.featured },
];

export function deskFilter(id: string | null | undefined): DeskFilter {
  return DESK_FILTERS.find((filter) => filter.id === id) ?? DESK_FILTERS[0];
}

/*
 * Values that cross into the browser for the studio desk.
 * DeskWork is one row on the form. WorkFields is the validated save payload.
 * Publishing is where a save will land: GitHub (live site), this computer
 * (local dev), or nowhere (Vercel with no token). The browser uses it only
 * to choose which sentence to show. lookalikes are the other paintings
 * that look like this one (empty when none do).
 *
 * missingDetails lists what a painting still lacks, for the badges on the
 * desk list. It reads only the row, so the browser can call it.
 * DESK_FILTERS are the list's filter buttons. Each badge filter matches on
 * the same text the badge shows, so a badge and its filter cannot disagree.
 */
import type { LikenessMember } from "@/lib/duplicates";
import type { SubjectId } from "@/lib/subjects";
import type { OriginalStatus } from "@/lib/types";

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
  originalStatus: OriginalStatus;
  originalPrice: number;
  printsAvailable: boolean;
  previewUrl: string;
  imageWidth: number;
  imageHeight: number;
  lookalikes: LikenessMember[];
  originalShownAt: string;
  printsShownAt: string[];
};

// availability is absent when the form had no Availability section: a desk
// tab opened before that section existed. The save then keeps the
// painting's current values instead of resetting them.
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
  availability?: {
    originalStatus: OriginalStatus;
    originalPrice: number;
    printsAvailable: boolean;
  };
  // Absent when the form had no Showings fields (a tab from before #104);
  // the save then keeps where the painting is shown.
  showings?: {
    originalShownAt: string;
    printsShownAt: string[];
  };
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
  return missingDetails(work).length > 0 || work.lookalikes.length > 0;
}

// Shown at a gallery or shop: the original, prints, or both (#104).
export function isOnDisplay(work: Pick<DeskWork, "originalShownAt" | "printsShownAt">) {
  return work.originalShownAt !== "" || work.printsShownAt.length > 0;
}

export const DESK_FILTERS: DeskFilter[] = [
  { id: "all", label: "All", matches: () => true },
  { id: "needs-work", label: "Needs work", matches: needsWork },
  { id: "title", label: "Title from file name", matches: hasBadge("Title from file name") },
  { id: "subject", label: "No subject", matches: hasBadge("No subject") },
  { id: "medium", label: "No medium", matches: hasBadge("No medium") },
  { id: "surface", label: "No surface", matches: hasBadge("No surface") },
  { id: "size", label: "No size", matches: hasBadge("No size") },
  { id: "duplicate", label: "Possible duplicate", matches: (work) => work.lookalikes.length > 0 },
  { id: "front-page", label: "Front page", matches: (work) => work.featured },
  { id: "on-display", label: "On display", matches: isOnDisplay },
];

export function deskFilter(id: string | null | undefined): DeskFilter {
  return DESK_FILTERS.find((filter) => filter.id === id) ?? DESK_FILTERS[0];
}

// What a desk form would send, as one string, so the edit page can tell
// whether anything differs from the painting as loaded. The hidden
// "intent" field is set by the Save and Remove buttons themselves, so it
// is left out. A chosen photograph counts by its name, size, and date; an
// empty file input sends an empty file and counts as nothing.
export function formSignature(formData: FormData) {
  const parts: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === "intent") continue;
    if (typeof value === "string") parts.push(`${key}=${value}`);
    else if (value.size > 0) parts.push(`${key}=file:${value.name}:${value.size}:${value.lastModified}`);
  }
  return JSON.stringify(parts);
}

// Previous / Next on a painting's edit page. The walk covers what the desk
// list shows under the chosen filter, in catalog order. The painting being
// edited always keeps its place, even if a save just took it out of the
// filter, so stepping on from it never loses the artist's spot. No wrap at
// the ends, so it is clear when a queue is finished. `position` is only
// given while the painting itself matches the filter.
export function stepThrough(
  works: DeskWork[],
  slug: string,
  filterId: string,
): { previous?: string; next?: string; position?: number; total: number; matches: boolean } {
  const filter = deskFilter(filterId);
  const walk = works.filter((work) => work.slug === slug || filter.matches(work));
  const total = works.filter(filter.matches).length;
  const index = walk.findIndex((work) => work.slug === slug);
  if (index < 0) return { total, matches: false };
  const matches = filter.matches(walk[index]);
  return {
    previous: walk[index - 1]?.slug,
    next: walk[index + 1]?.slug,
    position: matches ? walk.slice(0, index + 1).filter(filter.matches).length : undefined,
    total,
    matches,
  };
}

// The words before item `index` of `count` when they are read as a list:
// "A", "A and B", "A, B, and C". The edit page puts these between the
// look-alike painting links.
export function listSeparator(index: number, count: number) {
  if (index === 0) return "";
  if (count === 2) return " and ";
  return index === count - 1 ? ", and " : ", ";
}

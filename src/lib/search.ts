/*
 * The search box on The Work page. A painting matches when the typed text
 * (already trimmed and lowercased) appears anywhere in its title, medium,
 * note, series, subject names, or year. A blank search matches everything.
 * The series is included so a painting page's "Part of the … series" link
 * (/work?q=<series>) lists the whole series (#120).
 */
import { subjectLabel } from "@/lib/subjects";
import type { CatalogWork } from "@/lib/types";

export function matchesQuery(work: CatalogWork, needle: string) {
  if (!needle) return true;
  return [work.title, work.medium, work.statement, work.series, ...work.subjects.map(subjectLabel), String(work.year)]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

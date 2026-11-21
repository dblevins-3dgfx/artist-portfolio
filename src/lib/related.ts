/*
 * "More paintings" under a painting (#37). Paintings in the same series
 * (#120) come first, then ones that share the main subject (subjects[0]),
 * then ones that share any other subject, then the rest of the catalog. Within each group the order is shuffled,
 * seeded by the two web names, so:
 *   - a page shows the same picks on every visit (and every build), and
 *   - different paintings in a large subject show different picks, instead
 *     of all showing the first few in works.json order.
 * A painting with no subject gets a shuffled pick from the whole catalog.
 *
 * Generic over any record with a slug and subjects, like neighbours.ts,
 * which keeps the tests small.
 */
import { sameSeries } from "@/lib/series";
import type { SubjectId } from "@/lib/subjects";

type Relatable = { slug: string; subjects: SubjectId[]; series?: string };

export const RELATED_COUNT = 4;

// FNV-1a, a small fast string hash. Not for security: it only needs to
// spread pairs of web names evenly and give the same number every time.
function hash(text: string) {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export function relatedWorks<T extends Relatable>(works: T[], work: T, count = RELATED_COUNT): T[] {
  const main = work.subjects[0];
  const group = (other: T) => {
    if (sameSeries(work.series ?? "", other.series ?? "")) return 0;
    if (main && other.subjects.includes(main)) return 1;
    if (other.subjects.some((id) => work.subjects.includes(id))) return 2;
    return 3;
  };
  return works
    .filter((other) => other.slug !== work.slug)
    .map((other) => ({ other, group: group(other), order: hash(`${work.slug}|${other.slug}`) }))
    .sort((a, b) => a.group - b.group || a.order - b.order)
    .slice(0, count)
    .map(({ other }) => other);
}

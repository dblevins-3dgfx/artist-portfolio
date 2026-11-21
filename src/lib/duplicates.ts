/*
 * Group catalog previews that look like the same photograph.
 *
 * fingerprintDistance counts differing bits in the 64-bit mark from
 * image-hash.mjs. Four or fewer bits still grouped a second shot of one
 * painting. Five bits started pairing paintings that are not the same.
 * The desk only flags; it does not remove anything.
 *
 * A pair the artist marked "Not a duplicate" (#116) is never linked: either
 * picture's manifest entry listing the other's fingerprint is enough. Groups
 * are built from the remaining pairs, so two marked paintings can still be
 * grouped through a third that is close to both.
 */
import type { Manifest } from "@/lib/catalog";
import { fingerprintDistance } from "@/lib/image-hash.mjs";
import type { Work } from "@/lib/types";

export const POSSIBLE_DUPLICATE_DISTANCE = 4;

export type LikenessMember = { slug: string; title: string };

// groups: each set of look-alike paintings. lookalikes: for each painting
// in a group, the others in it, which the edit page names and links to.
// notDuplicates: for each painting, the ones marked as a different painting,
// which the edit page lists with an Undo.
export type CatalogLikeness = {
  groups: LikenessMember[][];
  lookalikes: Record<string, LikenessMember[]>;
  notDuplicates: Record<string, LikenessMember[]>;
};

function find(parent: number[], index: number) {
  let cursor = index;
  while (parent[cursor] !== cursor) {
    parent[cursor] = parent[parent[cursor]];
    cursor = parent[cursor];
  }
  return cursor;
}

export function catalogLikeness(works: Work[], manifest: Manifest): CatalogLikeness {
  const marked = works.flatMap((work) => {
    const file = manifest.files[`${work.slug}.jpg`];
    if (!file?.fingerprint) return [];
    return [{ slug: work.slug, title: work.title, fingerprint: file.fingerprint, marks: file.notDuplicateOf ?? [] }];
  });
  const markedDifferent = (a: (typeof marked)[number], b: (typeof marked)[number]) =>
    a.marks.includes(b.fingerprint) || b.marks.includes(a.fingerprint);
  const parent = marked.map((_, index) => index);
  for (let left = 0; left < marked.length; left += 1) {
    for (let right = left + 1; right < marked.length; right += 1) {
      if (fingerprintDistance(marked[left].fingerprint, marked[right].fingerprint) > POSSIBLE_DUPLICATE_DISTANCE) {
        continue;
      }
      if (markedDifferent(marked[left], marked[right])) continue;
      const leftRoot = find(parent, left);
      const rightRoot = find(parent, right);
      if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
    }
  }

  const buckets = new Map<number, LikenessMember[]>();
  marked.forEach((work, index) => {
    const root = find(parent, index);
    const members = buckets.get(root) ?? [];
    members.push({ slug: work.slug, title: work.title });
    buckets.set(root, members);
  });

  const groups = [...buckets.values()].filter((members) => members.length > 1);
  const lookalikes: Record<string, LikenessMember[]> = {};
  for (const members of groups) {
    for (const member of members) {
      lookalikes[member.slug] = members.filter((other) => other.slug !== member.slug);
    }
  }
  const notDuplicates: Record<string, LikenessMember[]> = {};
  for (const work of marked) {
    const others = marked.filter((other) => other.slug !== work.slug && markedDifferent(work, other));
    if (others.length > 0) notDuplicates[work.slug] = others.map(({ slug, title }) => ({ slug, title }));
  }
  return { groups, lookalikes, notDuplicates };
}

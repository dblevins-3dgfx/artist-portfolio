/*
 * Group catalog previews that look like the same photograph.
 *
 * fingerprintDistance counts differing bits in the 64-bit mark from
 * image-hash.mjs. Four or fewer bits still grouped a second shot of one
 * painting. Five bits started pairing paintings that are not the same.
 * The desk only flags; it does not remove anything.
 */
import type { Manifest } from "@/lib/catalog";
import { fingerprintDistance } from "@/lib/image-hash.mjs";
import type { Work } from "@/lib/types";

export const POSSIBLE_DUPLICATE_DISTANCE = 4;

export type LikenessMember = { slug: string; title: string };

// groups: each set of look-alike paintings. lookalikes: for each painting
// in a group, the others in it, which the edit page names and links to.
export type CatalogLikeness = {
  groups: LikenessMember[][];
  lookalikes: Record<string, LikenessMember[]>;
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
    const fingerprint = manifest.files[`${work.slug}.jpg`]?.fingerprint;
    if (!fingerprint) return [];
    return [{ slug: work.slug, title: work.title, fingerprint }];
  });
  const parent = marked.map((_, index) => index);
  for (let left = 0; left < marked.length; left += 1) {
    for (let right = left + 1; right < marked.length; right += 1) {
      if (fingerprintDistance(marked[left].fingerprint, marked[right].fingerprint) > POSSIBLE_DUPLICATE_DISTANCE) {
        continue;
      }
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
  return { groups, lookalikes };
}

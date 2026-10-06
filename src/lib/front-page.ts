import type { Work } from "@/lib/types";

/** How many pictures sit under the large one. */
const SELECTED_COUNT = 6;

/** Coeur d'Alene. The front-page set changes at midnight here. */
const STUDIO_TIME_ZONE = "America/Los_Angeles";

export function frontPageDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seedKey: string) {
  const random = mulberry32(hashSeed(seedKey));
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const current = copy[i];
    copy[i] = copy[j];
    copy[j] = current;
  }
  return copy;
}

export function selectFrontPage(works: Work[], dateKey: string) {
  const pinned = works.filter((work) => work.featured);
  const open = seededShuffle(
    works.filter((work) => !work.featured),
    dateKey,
  );

  if (pinned.length === 0) {
    const day = open.slice(0, SELECTED_COUNT + 1);
    return { lead: day[0], selected: day.slice(1) };
  }

  const [lead, ...pinnedRest] = pinned;
  const fill = Math.max(0, SELECTED_COUNT - pinnedRest.length);
  return { lead, selected: [...pinnedRest, ...open.slice(0, fill)] };
}

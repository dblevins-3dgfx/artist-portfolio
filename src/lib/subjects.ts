/*
 * The only subject ids the catalog accepts. `as const` freezes the literals,
 * so SubjectId is one of those ids rather than string.
 * Adding an entry here is enough for the desk menu and the work-page groups.
 * The batch script keeps the same ids in scripts/process-images.mjs.
 */
export const SUBJECTS = [
  { id: "children", label: "Children" },
  { id: "animals", label: "Animals" },
  { id: "places", label: "Places" },
  { id: "birds-and-flowers", label: "Birds & Flowers" },
  { id: "still-life", label: "Still Life" },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];

export function parseSubject(value: unknown): SubjectId | "" {
  if (typeof value !== "string") return "";
  return SUBJECTS.some((subject) => subject.id === value) ? (value as SubjectId) : "";
}

export function subjectLabel(id: string | undefined) {
  return SUBJECTS.find((subject) => subject.id === id)?.label ?? "";
}

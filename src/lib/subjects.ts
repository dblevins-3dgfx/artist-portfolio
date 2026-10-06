/*
 * The only subject ids the catalog accepts. `as const` freezes the literals,
 * so SubjectId is "children" | "animals" | "places" rather than string.
 * Adding an entry here is enough for the desk menu and the work-page groups.
 */
export const SUBJECTS = [
  { id: "children", label: "Children" },
  { id: "animals", label: "Animals" },
  { id: "places", label: "Places" },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];

export function parseSubject(value: unknown): SubjectId | "" {
  if (typeof value !== "string") return "";
  return SUBJECTS.some((subject) => subject.id === value) ? (value as SubjectId) : "";
}

export function subjectLabel(id: string | undefined) {
  return SUBJECTS.find((subject) => subject.id === id)?.label ?? "";
}

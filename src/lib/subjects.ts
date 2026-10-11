/*
 * Typed view of the subject list in subjects.mjs. That file is the one
 * copy of the ids and labels. SubjectId is one of those ids rather than
 * string.
 */
import { SUBJECTS } from "./subjects.mjs";

export { SUBJECTS };

export type SubjectId = (typeof SUBJECTS)[number]["id"];

export function parseSubject(value: unknown): SubjectId | "" {
  if (typeof value !== "string") return "";
  return SUBJECTS.some((subject) => subject.id === value) ? (value as SubjectId) : "";
}

export function subjectLabel(id: string | undefined) {
  return SUBJECTS.find((subject) => subject.id === id)?.label ?? "";
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { SUBJECTS, parseSubjects, subjectLabel } from "@/lib/subjects";

test("the two new subjects are in the list", () => {
  assert.equal(subjectLabel("narratives"), "Narratives");
  assert.equal(subjectLabel("commissioned"), "Commissioned Works");
});

test("subject ids are unique", () => {
  const ids = SUBJECTS.map((subject) => subject.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("parseSubjects keeps known ids in list order and drops the rest", () => {
  assert.deepEqual(parseSubjects(["commissioned", "children", "children", "dragons", 7]), ["children", "commissioned"]);
});

test("parseSubjects gives an empty list for anything that is not a list", () => {
  assert.deepEqual(parseSubjects("places"), []);
  assert.deepEqual(parseSubjects(undefined), []);
  assert.deepEqual(parseSubjects(null), []);
});

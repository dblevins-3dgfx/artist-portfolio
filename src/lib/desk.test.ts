import assert from "node:assert/strict";
import { test } from "node:test";
import { missingDetails } from "@/lib/desk";

const complete = {
  title: "Blue Sky, Blue Lake",
  subjects: ["places" as const],
  medium: "Oil",
  surface: "linen",
  widthIn: 12,
  heightIn: 16,
};

test("a painting with every detail needs nothing", () => {
  assert.deepEqual(missingDetails(complete), []);
});

test("each missing detail is named, in a fixed order", () => {
  assert.deepEqual(
    missingDetails({ title: "IMG 7889", subjects: [], medium: " ", surface: "", widthIn: 0, heightIn: 0 }),
    ["Title from file name", "No subject", "No medium", "No surface", "No size"],
  );
});

test("a size needs both width and height", () => {
  assert.deepEqual(missingDetails({ ...complete, heightIn: 0 }), ["No size"]);
  assert.deepEqual(missingDetails({ ...complete, widthIn: 0 }), ["No size"]);
});

test("camera file names are flagged as titles, and real titles are not", () => {
  for (const title of ["IMG 7889", "IMG 6727 Original", "img_4623", "DSC 0042", "PXL 20240101", "IMG 4977 Original Copy"]) {
    assert.deepEqual(missingDetails({ ...complete, title }), ["Title from file name"], title);
  }
  for (const title of ["Imagine", "Image of Spring", "The IMG 7889 Series", "1984", "Room 101"]) {
    assert.deepEqual(missingDetails({ ...complete, title }), [], title);
  }
});

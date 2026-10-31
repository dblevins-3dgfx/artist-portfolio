import assert from "node:assert/strict";
import { test } from "node:test";
import { imageFromForm, readWorkForm, slugify } from "@/lib/work-form";

// An array value becomes several entries under one name, the way a group
// of checked checkboxes sharing a name arrives from the browser.
function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

const valid = { title: "Blue Sky, Blue Lake", year: "2024" };

test("slugify makes a web name from a title", () => {
  assert.equal(slugify("Blue Sky, Blue Lake"), "blue-sky-blue-lake");
  assert.equal(slugify("Café Rosé"), "cafe-rose");
  assert.equal(slugify("  --The Neighbor's Cat!--  "), "the-neighbor-s-cat");
  assert.equal(slugify("!!!"), "");
  assert.equal(slugify("a".repeat(100)).length, 80);
});

test("a valid form gives the fields to save", () => {
  const parsed = readWorkForm(
    form({
      ...valid,
      medium: "Oil",
      surface: "Canvas",
      widthIn: "12",
      heightIn: "9.5",
      statement: "Line one\r\nLine two",
      subjects: "places",
      featured: "on",
    }),
  );
  assert.deepEqual(parsed, {
    intent: "save",
    existingSlug: "",
    fields: {
      slug: "blue-sky-blue-lake",
      title: "Blue Sky, Blue Lake",
      year: 2024,
      medium: "Oil",
      surface: "Canvas",
      widthIn: 12,
      heightIn: 9.5,
      statement: "Line one\nLine two",
      subjects: ["places"],
      featured: true,
    },
  });
});

test("whitespace in the title is collapsed and blank sizes are zero", () => {
  const parsed = readWorkForm(form({ ...valid, title: "  Blue   Sky \n Lake " }));
  assert.ok("fields" in parsed);
  assert.equal(parsed.fields.title, "Blue Sky Lake");
  assert.equal(parsed.fields.widthIn, 0);
  assert.equal(parsed.fields.heightIn, 0);
});

test("a typed web name is used, and an unknown subject is dropped", () => {
  const parsed = readWorkForm(form({ ...valid, slug: "lake-study", subjects: "dragons" }));
  assert.ok("fields" in parsed);
  assert.equal(parsed.fields.slug, "lake-study");
  assert.deepEqual(parsed.fields.subjects, []);
});

test("every checked subject is kept, in subject-list order, without repeats", () => {
  const parsed = readWorkForm(
    form({ ...valid, subjects: ["commissioned", "portraits", "dragons", "portraits", "narratives"] }),
  );
  assert.ok("fields" in parsed);
  assert.deepEqual(parsed.fields.subjects, ["portraits", "narratives", "commissioned"]);
});

test("no checked subjects gives an empty list", () => {
  const parsed = readWorkForm(form(valid));
  assert.ok("fields" in parsed);
  assert.deepEqual(parsed.fields.subjects, []);
});

test("bad fields come back as errors", () => {
  const cases: Record<string, string>[] = [
    { ...valid, title: "   " },
    { ...valid, year: "24" },
    { ...valid, year: "1799" },
    { ...valid, year: "2101" },
    { ...valid, widthIn: "12in" },
    { ...valid, heightIn: "201" },
    { ...valid, widthIn: "1.234" },
    { ...valid, slug: "Not A Slug" },
    { ...valid, title: "!!!" },
    { ...valid, existingSlug: "../works" },
  ];
  for (const fields of cases) {
    assert.ok("error" in readWorkForm(form(fields)), JSON.stringify(fields));
  }
});

test("the web name of the desk's Add page is refused, typed or taken from the title", () => {
  assert.ok("error" in readWorkForm(form({ ...valid, slug: "new" })));
  assert.ok("error" in readWorkForm(form({ ...valid, slug: "prices" })));
  assert.ok("error" in readWorkForm(form({ ...valid, title: "New" })));
  const typed = readWorkForm(form({ ...valid, title: "New", slug: "new-snow" }));
  assert.ok("fields" in typed && typed.fields.slug === "new-snow");
});

const forSale = { ...valid, availability: "1", originalStatus: "in-studio", originalPrice: "$1,200", printsAvailable: "on" };

test("availability and price are read when the form has the Availability section", () => {
  const parsed = readWorkForm(form(forSale));
  assert.ok("fields" in parsed);
  assert.deepEqual(parsed.fields.availability, { originalStatus: "in-studio", originalPrice: 1200, printsAvailable: true });
  const sold = readWorkForm(form({ ...forSale, originalStatus: "sold", originalPrice: "", printsAvailable: [] }));
  assert.ok("fields" in sold);
  assert.deepEqual(sold.fields.availability, { originalStatus: "sold", originalPrice: 0, printsAvailable: false });
});

test("a form without the Availability section leaves availability out, so the save keeps it", () => {
  const parsed = readWorkForm(form({ ...valid, originalStatus: "sold" }));
  assert.ok("fields" in parsed);
  assert.equal("availability" in parsed.fields, false);
});

test("an available original needs a price in whole dollars", () => {
  for (const fields of [
    { ...forSale, originalPrice: "" },
    { ...forSale, originalPrice: "12.50" },
    { ...forSale, originalPrice: "1000001" },
    { ...forSale, originalPrice: "0" },
    { ...forSale, originalPrice: "twelve" },
    { ...forSale, originalStatus: "maybe" },
  ]) {
    assert.ok("error" in readWorkForm(form(fields)), JSON.stringify(fields));
  }
});

test("removing a painting needs its existing web name", () => {
  assert.deepEqual(readWorkForm(form({ intent: "delete", existingSlug: "bon-voyage" })), {
    intent: "delete",
    existingSlug: "bon-voyage",
  });
  assert.ok("error" in readWorkForm(form({ intent: "delete" })));
});

test("no photograph means keep the current one", async () => {
  assert.deepEqual(await imageFromForm(new FormData()), { bytes: null });
  const empty = new FormData();
  empty.set("image", new File([], "empty.jpg"));
  assert.deepEqual(await imageFromForm(empty), { bytes: null });
});

test("a photograph up to 4 MB is read and a larger one is refused", async () => {
  const data = new FormData();
  data.set("image", new File([new Uint8Array(4 * 1024 * 1024)], "ok.jpg"));
  const ok = await imageFromForm(data);
  assert.ok("bytes" in ok && ok.bytes?.length === 4 * 1024 * 1024);

  data.set("image", new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.jpg"));
  assert.ok("error" in (await imageFromForm(data)));
});

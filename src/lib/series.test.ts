import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanSeries, needsSeriesWord, needsThe, sameSeries, seriesKey, seriesNames } from "@/lib/series";
import { matchesQuery } from "@/lib/search";
import type { CatalogWork } from "@/lib/types";

test("a series name is stored on one line, trimmed, with single spaces", () => {
  assert.equal(cleanSeries("  Madera   Canyon\n "), "Madera Canyon");
  assert.equal(cleanSeries(""), "");
  assert.equal(cleanSeries(7), "");
  assert.equal(cleanSeries("x".repeat(100)).length, 80);
});

test("capitals and spacing do not make a different series", () => {
  assert.equal(seriesKey(" Madera  Canyon "), "madera canyon");
  assert.equal(sameSeries("Madera Canyon", "madera  canyon"), true);
  assert.equal(sameSeries("Madera Canyon", "Madera Creek"), false);
  assert.equal(sameSeries("", ""), false, "two paintings in no series are not one series");
  assert.equal(sameSeries("  ", ""), false);
});

test("the desk suggests each series once, in the spelling first used, sorted", () => {
  const names = seriesNames([
    { series: "Madera Canyon" },
    { series: "" },
    { series: "birds on wood" },
    { series: "madera  canyon" },
    { series: "Birds on Wood" },
    { series: "Armor of God" },
  ]);
  assert.deepEqual(names, ["Armor of God", "birds on wood", "Madera Canyon"]);
  assert.deepEqual(seriesNames([]), []);
});

test("the word series is added unless the name already ends with it", () => {
  assert.equal(needsSeriesWord("Madera Canyon"), true);
  assert.equal(needsSeriesWord("Birds on Wood Series"), false);
  assert.equal(needsSeriesWord("The series"), false);
  assert.equal(needsSeriesWord("Seriesly Good"), true);
});

const painting = (title: string, series: string): CatalogWork => ({
  slug: title.toLowerCase().replace(/\W+/g, "-"),
  title,
  year: 2024,
  medium: "Oil",
  surface: "",
  subjects: [],
  series,
  statement: "",
  image: "",
  imageWidth: 0,
  imageHeight: 0,
});

test("the word the is added unless the name already starts with it", () => {
  assert.equal(needsThe("Madera Canyon"), true);
  assert.equal(needsThe("The Hen House"), false);
  assert.equal(needsThe("the armor of god"), false);
  assert.equal(needsThe("Theodore's Garden"), true);
});

test("the gallery search finds a painting by its series", () => {
  const plein = painting("Plein Air 1", "Madera Canyon");
  assert.equal(matchesQuery(plein, "madera canyon"), true);
  assert.equal(matchesQuery(painting("Sunflower", ""), "madera canyon"), false);
  assert.equal(matchesQuery(plein, ""), true);
});

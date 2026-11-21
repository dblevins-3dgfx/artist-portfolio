/*
 * Series (#120): a painting belongs to at most one, named by the artist.
 * Names are kept as typed but compared by seriesKey, so "Madera Canyon",
 * "madera  canyon" and " Madera Canyon " are one series. Safe to import in
 * the browser (the desk form and the gallery use it).
 */
export const SERIES_LENGTH = 80;

// The name as stored: one line, single spaces, trimmed, capped.
export function cleanSeries(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, SERIES_LENGTH) : "";
}

// The name as compared. "" means no series.
export function seriesKey(name: string) {
  return cleanSeries(name).toLowerCase();
}

export function sameSeries(a: string, b: string) {
  const key = seriesKey(a);
  return key !== "" && key === seriesKey(b);
}

// Every series in use, each once, in the spelling first seen, sorted. The
// desk offers these as suggestions while typing.
export function seriesNames(works: { series: string }[]) {
  const names = new Map<string, string>();
  for (const work of works) {
    const key = seriesKey(work.series);
    if (key && !names.has(key)) names.set(key, cleanSeries(work.series));
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

// "Part of the Madera Canyon series" adds the word "series" after the name,
// unless the name already ends with it ("the Birds on Wood Series").
export function needsSeriesWord(name: string) {
  return !/\bseries$/i.test(cleanSeries(name));
}

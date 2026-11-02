/*
 * Showings: the galleries and shops that have paintings on display, and
 * where each painting is shown (#104). The list is stored in
 * content/venues.json and edited on the desk at /curate/venues. Paintings
 * name venues by id (see Work.originalShownAt and printsShownAt), so a
 * rename does not touch every painting. Desk-only: no public page imports
 * this file or the JSON (print-prices.test.ts checks that).
 *
 * An original can be at one venue at most, and only while it is Available
 * ("in-studio"); prints can be at any number, but only while prints are
 * offered. Only where things are now is kept, not a history.
 *
 * parseVenues reads the stored file leniently, dropping anything it cannot
 * use, the way parsePrintPrices does. checkVenues is strict: it is what a
 * desk save goes through, and it returns a sentence for the form.
 */
import { asRecord, isCatalogSlug } from "@/lib/catalog";
import type { OriginalStatus } from "@/lib/types";

export type Venue = {
  id: string;
  name: string;
  city: string;
  contact: string;
  notes: string;
};

export const MAX_VENUES = 100;
const NAME_LENGTH = 80;
const CITY_LENGTH = 80;
const CONTACT_LENGTH = 200;
const NOTES_LENGTH = 1000;
const ID_LENGTH = 60;

function oneLine(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function notesText(value: unknown) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim().slice(0, NOTES_LENGTH) : "";
}

// Ids look like web names ("blue-door-gallery"), so they are safe as keys
// and in form values.
export function isVenueId(value: unknown): value is string {
  return typeof value === "string" && value.length <= ID_LENGTH && isCatalogSlug(value);
}

export function parseVenues(value: unknown): Venue[] {
  const record = asRecord(value);
  const list = Array.isArray(record?.venues) ? record.venues : [];
  const venues: Venue[] = [];
  const ids = new Set<string>();
  for (const entry of list) {
    const venue = asRecord(entry);
    if (!venue || !isVenueId(venue.id) || ids.has(venue.id) || venues.length >= MAX_VENUES) continue;
    const name = oneLine(venue.name, NAME_LENGTH);
    if (!name) continue;
    ids.add(venue.id);
    venues.push({
      id: venue.id,
      name,
      city: oneLine(venue.city, CITY_LENGTH),
      contact: oneLine(venue.contact, CONTACT_LENGTH),
      notes: notesText(venue.notes),
    });
  }
  return venues;
}

// A new venue's id comes from its name, made unique among the others.
function newVenueId(name: string, taken: Set<string>) {
  const base =
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, ID_LENGTH - 4) || "venue";
  let id = base;
  for (let count = 2; taken.has(id); count += 1) id = `${base}-${count}`;
  return id;
}

// What the venue page sends: every row, in order. A row keeps its id when
// it has one; a new row arrives with an empty id and gets one here.
export function checkVenues(value: unknown): { error: string } | Venue[] {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.venues)) {
    return { error: "The venue list did not arrive. Reload the page and try again." };
  }
  if (record.venues.length > MAX_VENUES) return { error: `Keep it to ${MAX_VENUES} venues or fewer.` };
  const rows = record.venues.map((entry) => asRecord(entry) ?? {});
  const taken = new Set<string>();
  for (const row of rows) {
    if (row.id === undefined || row.id === "") continue;
    if (!isVenueId(row.id) || taken.has(row.id)) {
      return { error: "The venue list did not arrive. Reload the page and try again." };
    }
    taken.add(row.id);
  }
  const names = new Map<string, string>();
  const venues: Venue[] = [];
  for (const row of rows) {
    const name = oneLine(row.name, NAME_LENGTH + 1);
    if (!name) return { error: "Give every venue a name, or remove the empty one." };
    if (name.length > NAME_LENGTH) return { error: `Keep each venue name to ${NAME_LENGTH} characters.` };
    const earlier = names.get(name.toLowerCase());
    if (earlier) return { error: `Two venues are both called “${earlier}”. Give each a different name.` };
    names.set(name.toLowerCase(), name);
    let id = isVenueId(row.id) ? row.id : "";
    if (!id) {
      id = newVenueId(name, taken);
      taken.add(id);
    }
    venues.push({
      id,
      name,
      city: oneLine(row.city, CITY_LENGTH),
      contact: oneLine(row.contact, CONTACT_LENGTH),
      notes: notesText(row.notes),
    });
  }
  return venues;
}

export function serializeVenues(venues: Venue[]) {
  return `${JSON.stringify({ venues }, null, 2)}\n`;
}

// Where a painting is shown, as a save should store it: only venues still
// on the list, each once, no venue for an original that is not Available,
// and none for prints that are not offered (the desk hides those choices
// then).
export function cleanShowings(
  showings: { originalShownAt: string; printsShownAt: string[] },
  availability: { originalStatus: OriginalStatus; printsAvailable: boolean },
  venueIds: Set<string>,
) {
  const originalShownAt =
    availability.originalStatus === "in-studio" && venueIds.has(showings.originalShownAt)
      ? showings.originalShownAt
      : "";
  const printsShownAt = availability.printsAvailable
    ? [...new Set(showings.printsShownAt)].filter((id) => venueIds.has(id))
    : [];
  return { originalShownAt, printsShownAt };
}

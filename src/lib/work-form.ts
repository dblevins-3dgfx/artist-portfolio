/*
 * Desk form parsing. No GitHub, no image processing, no filesystem.
 * A bad field returns `{ error }` so the form can show it. A good save
 * returns `{ intent, fields }`. TypeScript narrows the union after
 * `if ("error" in parsed)`, the way a tagged union would in C++.
 */
import type { WorkFields } from "@/lib/desk";
import type { OriginalStatus } from "@/lib/types";
import { isCatalogSlug } from "@/lib/catalog";
import { parseSubjects } from "@/lib/subjects";

// /curate/new and /curate/prices are desk pages. A painting with one of
// these web names would share its address, and its own edit page could
// never be opened.
const RESERVED_SLUGS = new Set(["new", "prices"]);

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function textField(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

function inches(value: string) {
  if (!value) return 0;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 200) return null;
  return number;
}

const ORIGINAL_STATUSES: OriginalStatus[] = ["not-for-sale", "in-studio", "sold"];
const MAX_PRICE = 1_000_000;

// Whole US dollars. "$1,200" and "1200" both read as 1200; blank is 0, no
// price. Anything else, cents included, is refused rather than rounded.
function dollars(value: string) {
  const digits = value.replace(/[$,\s]/g, "");
  if (!digits) return 0;
  if (!/^\d{1,7}$/.test(digits)) return null;
  const number = Number(digits);
  return number >= 1 && number <= MAX_PRICE ? number : null;
}

// The Availability section sends a hidden "availability" field. Without it
// (a tab from before the section existed) this returns undefined and the
// save keeps the painting's current availability.
function readAvailability(formData: FormData): { error: string } | WorkFields["availability"] {
  if (formData.get("availability") !== "1") return undefined;
  const status = formData.get("originalStatus");
  const originalStatus = ORIGINAL_STATUSES.find((value) => value === status);
  if (!originalStatus) return { error: "Choose whether the original is for sale." };
  const originalPrice = dollars(textField(formData, "originalPrice", 16));
  if (originalPrice === null) {
    return { error: "Enter the price in whole dollars, like 1200, up to 1,000,000." };
  }
  if (originalStatus === "in-studio" && originalPrice === 0) {
    return { error: "Enter a price for the original, or choose Not for sale." };
  }
  return { originalStatus, originalPrice, printsAvailable: formData.get("printsAvailable") === "on" };
}

export function readWorkForm(
  formData: FormData,
):
  | { error: string }
  | { intent: "delete"; existingSlug: string }
  | { intent: "save"; existingSlug: string; fields: WorkFields } {
  const existingSlug = textField(formData, "existingSlug", 80);
  if (existingSlug && !isCatalogSlug(existingSlug)) {
    return { error: "That painting’s web name is not valid. Reload the page." };
  }
  const intent = formData.get("intent") === "delete" ? "delete" : "save";
  if (intent === "delete") {
    if (!existingSlug) return { error: "Choose a painting already in the catalog." };
    return { intent: "delete" as const, existingSlug };
  }

  const title = textField(formData, "title", 120).replace(/\s+/g, " ").trim();
  if (!title) return { error: "Give the painting a title." };
  const yearText = textField(formData, "year", 4);
  if (!/^\d{4}$/.test(yearText)) return { error: "Enter the year as four digits." };
  const year = Number(yearText);
  if (year < 1800 || year > 2100) return { error: "Enter a year between 1800 and 2100." };
  const medium = textField(formData, "medium", 80).replace(/\s+/g, " ").trim();
  const surface = textField(formData, "surface", 80).replace(/\s+/g, " ").trim();
  const widthIn = inches(textField(formData, "widthIn", 8));
  const heightIn = inches(textField(formData, "heightIn", 8));
  if (widthIn === null || heightIn === null) {
    return { error: "Enter the size in inches, or leave both blank." };
  }
  const statement = textField(formData, "statement", 2000);
  const requested = textField(formData, "slug", 80);
  const slug = requested || slugify(title);
  if (!isCatalogSlug(slug)) {
    return { error: "The web name needs letters or numbers. You can leave it blank and it will be taken from the title." };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { error: `The web name “${slug}” is used by the desk itself. Type a different web name.` };
  }
  const availability = readAvailability(formData);
  if (availability && "error" in availability) return availability;
  const fields: WorkFields = {
    slug,
    title,
    year,
    medium,
    surface,
    widthIn,
    heightIn,
    statement,
    // One checkbox per subject, all named "subjects". getAll returns the
    // value of every checked box; an unchecked box sends nothing at all.
    subjects: parseSubjects(formData.getAll("subjects")),
    featured: formData.get("featured") === "on",
    ...(availability ? { availability } : {}),
  };
  return { intent: "save" as const, existingSlug, fields };
}

// Leaves room under the 4.5 MB request limit in next.config.ts for the other
// form fields. Keep in step with MAX_PHOTO_BYTES in curate-desk.tsx, which
// checks the same size in the browser.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function imageFromForm(
  formData: FormData,
): Promise<{ error: string } | { bytes: Buffer | null }> {
  const value = formData.get("image");
  if (!(value instanceof File) || value.size === 0) return { bytes: null as Buffer | null };
  if (value.size > MAX_PHOTO_BYTES) {
    return { error: "That photograph is over 4 MB. Export a smaller JPEG and try again." };
  }
  return { bytes: Buffer.from(await value.arrayBuffer()) };
}

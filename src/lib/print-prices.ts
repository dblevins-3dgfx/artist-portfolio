/*
 * The standard print price list: one price per print size and material,
 * shared by every painting that offers prints. Stored in
 * content/print-prices.json and edited on the desk at /curate/prices.
 * Desk-only: no public page imports this file or the JSON
 * (print-prices.test.ts checks that).
 *
 * prices[material][size] is whole US dollars. A missing entry means that
 * size is not offered in that material. Names are the keys, so the order
 * of sizes and materials lives in their own lists.
 *
 * parsePrintPrices reads the stored file leniently, dropping anything it
 * cannot use, the way parseWorks does. checkPrintPrices is strict: it is
 * what a desk save goes through, and it returns a sentence for the form.
 */
import { asRecord } from "@/lib/catalog";

export type PrintPrices = {
  currency: "USD";
  sizes: string[];
  materials: string[];
  prices: Record<string, Record<string, number>>;
};

export const MAX_PRINT_NAMES = 30;
const NAME_LENGTH = 40;
const MAX_PRINT_PRICE = 100_000;

export function emptyPrintPrices(): PrintPrices {
  return { currency: "USD", sizes: [], materials: [], prices: {} };
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function validPrice(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_PRINT_PRICE;
}

// Names compare without case, so "Canvas" and "canvas" count as the same.
function uniqueNames(values: unknown) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of Array.isArray(values) ? values : []) {
    const name = cleanName(value).slice(0, NAME_LENGTH);
    if (!name || seen.has(name.toLowerCase()) || names.length >= MAX_PRINT_NAMES) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}

export function parsePrintPrices(value: unknown): PrintPrices {
  const record = asRecord(value);
  if (!record) return emptyPrintPrices();
  const sizes = uniqueNames(record.sizes);
  const materials = uniqueNames(record.materials);
  const stored = asRecord(record.prices) ?? {};
  const prices: PrintPrices["prices"] = {};
  for (const material of materials) {
    const row = asRecord(stored[material]) ?? {};
    for (const size of sizes) {
      if (validPrice(row[size])) (prices[material] ??= {})[size] = row[size] as number;
    }
  }
  return { currency: "USD", sizes, materials, prices };
}

// Whole dollars from what was typed in a cell: "$85", "1,200", or blank.
// Returns 0 for blank and null for anything that is not whole dollars.
function cellDollars(value: unknown) {
  if (typeof value === "number") return validPrice(value) ? value : null;
  if (typeof value !== "string") return 0;
  const digits = value.replace(/[$,\s]/g, "");
  if (!digits) return 0;
  if (!/^\d{1,6}$/.test(digits)) return null;
  const number = Number(digits);
  return validPrice(number) ? number : null;
}

function checkNames(values: unknown, kind: "size" | "material"): { error: string } | string[] {
  const list = Array.isArray(values) ? values : [];
  if (list.length > MAX_PRINT_NAMES) return { error: `Keep it to ${MAX_PRINT_NAMES} ${kind}s or fewer.` };
  const seen = new Map<string, string>();
  const names: string[] = [];
  for (const value of list) {
    const name = cleanName(value);
    if (!name) return { error: `Give every ${kind} a name, or remove the empty one.` };
    if (name.length > NAME_LENGTH) return { error: `Keep each ${kind} name to ${NAME_LENGTH} characters.` };
    const earlier = seen.get(name.toLowerCase());
    if (earlier) return { error: `Two ${kind}s are both called “${earlier}”. Give each a different name.` };
    seen.set(name.toLowerCase(), name);
    names.push(name);
  }
  return names;
}

export function checkPrintPrices(value: unknown): { error: string } | PrintPrices {
  const record = asRecord(value);
  if (!record) return { error: "The price list did not arrive. Reload the page and try again." };
  const sizes = checkNames(record.sizes, "size");
  if ("error" in sizes) return sizes;
  const materials = checkNames(record.materials, "material");
  if ("error" in materials) return materials;
  const sent = asRecord(record.prices) ?? {};
  const prices: PrintPrices["prices"] = {};
  for (const material of materials) {
    const row = asRecord(sent[material]) ?? {};
    for (const size of sizes) {
      const price = cellDollars(row[size]);
      if (price === null) {
        return { error: `Enter the ${size} ${material} price in whole dollars, like 85, up to 100,000, or leave it blank.` };
      }
      if (price > 0) (prices[material] ??= {})[size] = price;
    }
  }
  return { currency: "USD", sizes, materials, prices };
}

export function serializePrintPrices(list: PrintPrices) {
  const prices: PrintPrices["prices"] = {};
  for (const material of list.materials) {
    for (const size of list.sizes) {
      const price = list.prices[material]?.[size];
      if (price) (prices[material] ??= {})[size] = price;
    }
  }
  return `${JSON.stringify({ currency: "USD", sizes: list.sizes, materials: list.materials, prices }, null, 2)}\n`;
}

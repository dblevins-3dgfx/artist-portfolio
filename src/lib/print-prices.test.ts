import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { checkPrintPrices, emptyPrintPrices, parsePrintPrices, serializePrintPrices } from "@/lib/print-prices";

const list = {
  currency: "USD" as const,
  sizes: ["8×10", "11×14"],
  materials: ["Paper", "Canvas"],
  prices: { Paper: { "8×10": 35, "11×14": 55 }, Canvas: { "11×14": 110 } },
};

test("a missing or broken file reads as an empty list", () => {
  assert.deepEqual(parsePrintPrices(undefined), emptyPrintPrices());
  assert.deepEqual(parsePrintPrices([]), emptyPrintPrices());
  assert.deepEqual(parsePrintPrices({ sizes: "8×10" }), emptyPrintPrices());
});

test("the stored file round-trips", () => {
  assert.deepEqual(parsePrintPrices(JSON.parse(serializePrintPrices(list))), list);
  assert.ok(serializePrintPrices(list).endsWith("}\n"));
});

test("reading drops blank and repeated names, bad prices, and prices for unknown names", () => {
  const read = parsePrintPrices({
    sizes: ["8×10", " ", "8×10", "8X10", 5],
    materials: ["Paper", "paper"],
    prices: { Paper: { "8×10": 35, "8X10": 12.5, "16×20": 85 }, Metal: { "8×10": 90 } },
  });
  assert.deepEqual(read, { currency: "USD", sizes: ["8×10", "8X10"], materials: ["Paper"], prices: { Paper: { "8×10": 35 } } });
});

test("a desk save accepts dollars as typed and treats a blank cell as not offered", () => {
  const checked = checkPrintPrices({
    sizes: [" 8×10 ", "11×14"],
    materials: ["Paper"],
    prices: { Paper: { "8×10": "$35", "11×14": "" } },
  });
  assert.deepEqual(checked, { currency: "USD", sizes: ["8×10", "11×14"], materials: ["Paper"], prices: { Paper: { "8×10": 35 } } });
});

test("a desk save refuses blank or repeated names and prices that are not whole dollars", () => {
  const bad = [
    { sizes: [""], materials: [], prices: {} },
    { sizes: ["8×10", "8×10 "], materials: [], prices: {} },
    { sizes: [], materials: ["Paper", "PAPER"], prices: {} },
    { sizes: ["8×10"], materials: ["Paper"], prices: { Paper: { "8×10": "35.50" } } },
    { sizes: ["8×10"], materials: ["Paper"], prices: { Paper: { "8×10": "0" } } },
    { sizes: ["8×10"], materials: ["Paper"], prices: { Paper: { "8×10": "200000" } } },
    { sizes: Array.from({ length: 31 }, (_, index) => `${index}`), materials: [], prices: {} },
    null,
  ];
  for (const value of bad) assert.ok("error" in checkPrintPrices(value), JSON.stringify(value));
});

// The list is desk-only. Walk every source file outside the desk and make
// sure none of them imports the price list module or its JSON, so a public
// page cannot start showing prices by accident. (catalog.ts only names the
// file's path in the write allow-list; that is not an import.)
test("no public page or component imports the print price list", () => {
  const root = path.join(process.cwd(), "src");
  const deskOnly = [
    path.join("app", "curate"),
    path.join("components", "print-prices-editor.tsx"),
    path.join("lib", "print-prices.ts"),
    path.join("lib", "print-prices.test.ts"),
    path.join("lib", "catalog-store.ts"),
  ];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs)$/.test(name)) files.push(full);
    }
  };
  walk(root);
  const offenders = files.filter((file) => {
    const relative = path.relative(root, file);
    if (deskOnly.some((allowed) => relative === allowed || relative.startsWith(allowed + path.sep))) return false;
    return /(?:from|import|require)\s*\(?\s*["'][^"']*print-prices(?:\.json)?["']/.test(readFileSync(file, "utf8"));
  });
  assert.deepEqual(offenders.map((file) => path.relative(root, file)), []);
});
